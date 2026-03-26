from datetime import date, timedelta
import math
import re

import numpy as np
import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Portfolio, PortfolioStock, TimeSeriesForecast, GrowthAnalysis, PortfolioRating
from .serializers import PortfolioSerializer
from .linear_regression import predict_next_close
from .logistic_regression import predict_next_direction
try:
    from .arima_forecast import forecast_arima
except ImportError:
    from .arima_forecast import forecast_ann as forecast_arima
from .rnn_forecast import forecast_rnn
from apps.stocks.models import Stock, StockCatalog
from services.stock_service import get_stock_profile, get_history, get_live_quote
from apps.ml_analytics.models import (
    LinearRegressionResult,
    LogisticRegressionResult,
    PortfolioClusteringResult,
    PortfolioSummaryReport,
    PortfolioRecommendations,
)

class PortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).prefetch_related('holdings__stock', 'holdings__stock__prices').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _close_prices_for_regression(self, holding):
        history = get_history(holding.stock.symbol, period='6mo', interval='1d') or []
        api_prices = [
            float(row['close_price'])
            for row in history
            if row.get('close_price') is not None
        ]
        latest_candle = None
        if history:
            last = history[-1]
            latest_close = float(last.get('close_price')) if last.get('close_price') is not None else None
            latest_open = float(last.get('open_price')) if last.get('open_price') is not None else latest_close
            latest_high = float(last.get('high_price')) if last.get('high_price') is not None else latest_close
            latest_low = float(last.get('low_price')) if last.get('low_price') is not None else latest_close
            latest_candle = {
                'open_price': latest_open,
                'close_price': latest_close,
                'high_price': latest_high,
                'low_price': latest_low,
            }

        if len(api_prices) >= 2:
            return api_prices, 'yfinance', latest_candle

        return [], 'yfinance', latest_candle

    def _close_prices_for_logistic(self, holding):
        history = get_history(holding.stock.symbol, period='1y', interval='1d') or []
        return [
            float(row['close_price'])
            for row in history
            if row.get('close_price') is not None
        ]


    @action(detail=True, methods=['POST'], url_path='add-stock')
    def add_stock(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'quantity must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        purchase_price = request.data.get('purchase_price', 0)
        purchase_date = request.data.get('purchase_date')
        profile = get_stock_profile(symbol) or {}
        stock_defaults = {
            'name': profile.get('name') or symbol,
            'sector': profile.get('sector') or '',
            'industry': profile.get('industry') or '',
            'market_cap': profile.get('market_cap'),
            'pe_ratio': profile.get('pe_ratio'),
            'dividend_yield': profile.get('dividend_yield'),
            '_52_week_high': profile.get('52_week_high'),
            '_52_week_low': profile.get('52_week_low'),
        }
        stock, created = Stock.objects.get_or_create(symbol=symbol, defaults=stock_defaults)
        if not created:
            for field, value in stock_defaults.items():
                if value not in (None, ''):
                    setattr(stock, field, value)
            stock.save()
        holding, _ = PortfolioStock.objects.get_or_create(portfolio=portfolio, stock=stock)
        holding.quantity = quantity
        holding.purchase_price = purchase_price
        holding.purchase_date = purchase_date
        holding.save()
        portfolio.refresh_from_db()
        return Response(PortfolioSerializer(portfolio).data)

    @action(detail=True, methods=['DELETE', 'POST'], url_path='remove-stock')
    def remove_stock(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stock = Stock.objects.get(symbol=symbol)
        except Stock.DoesNotExist:
            return Response({'detail': 'Stock not found'}, status=status.HTTP_400_BAD_REQUEST)
        PortfolioStock.objects.filter(portfolio=portfolio, stock=stock).delete()
        return Response(PortfolioSerializer(portfolio).data)

    @action(detail=True, methods=['GET'], url_path='linear-regression')
    def linear_regression(self, request, pk=None):
        portfolio = self.get_object()
        holdings = (
            portfolio.holdings
            .select_related('stock')
            .prefetch_related('stock__prices')
            .all()
        )

        predictions = []
        skipped = []
        lr_rows_to_create = []
        for holding in holdings:
            prices, source, latest_candle = self._close_prices_for_regression(holding)
            if len(prices) < 2:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': 'Need at least 2 historical close prices from yfinance',
                    }
                )
                continue

            result = predict_next_close(prices=prices, symbol=holding.stock.symbol)
            
            # ✅ STORE IN DATABASE
            lr_rows_to_create.append(
                LinearRegressionResult(
                    portfolio=portfolio,
                    stock=holding.stock,
                    points_used=result.points_used,
                    slope=result.slope,
                    intercept=result.intercept,
                    latest_close=result.latest_close,
                    predicted_next_close=result.predicted_next_close,
                    predicted_change_percent=result.predicted_change_percent,
                    data_source=source,
                )
            )
            current_price = result.latest_close
            open_price = None
            min_price = None
            max_price = None
            close_price = None
            if latest_candle:
                open_price = latest_candle.get('open_price')
                min_price = latest_candle.get('low_price')
                max_price = latest_candle.get('high_price')
                close_price = latest_candle.get('close_price')
                current_price = close_price if close_price is not None else current_price

            change_pct = float(result.predicted_change_percent or 0.0)
            if change_pct >= 0.8:
                signal = 'BUY'
            elif change_pct <= -0.8:
                signal = 'SELL'
            else:
                signal = 'HOLD'

            predictions.append(
                {
                    'symbol': result.symbol,
                    'points_used': result.points_used,
                    'slope': result.slope,
                    'intercept': result.intercept,
                    'latest_close': result.latest_close,
                    'current_price': current_price,
                    'open_price': open_price,
                    'min_price': min_price,
                    'max_price': max_price,
                    'close_price': close_price,
                    'predicted_next_close': result.predicted_next_close,
                    'lr_predict': result.predicted_next_close,
                    'predicted_change_percent': result.predicted_change_percent,
                    'signal': signal,
                    'data_source': source,
                }
            )

        if lr_rows_to_create:
            LinearRegressionResult.objects.bulk_create(lr_rows_to_create)

        return Response(
            {
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'model': 'linear_regression',
                'predictions': predictions,
                'skipped': skipped,
            }
        )

    @action(detail=True, methods=['GET'], url_path='logistic-regression')
    def logistic_regression(self, request, pk=None):
        portfolio = self.get_object()
        holdings = (
            portfolio.holdings
            .select_related('stock')
            .all()
        )

        predictions = []
        skipped = []
        for holding in holdings:
            prices = self._close_prices_for_logistic(holding)
            if len(prices) < 35:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': 'Need at least 35 close prices from yfinance',
                    }
                )
                continue

            try:
                result = predict_next_direction(prices, symbol=holding.stock.symbol)
            except ValueError as exc:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': str(exc),
                    }
                )
                continue

            # ✅ STORE IN DATABASE
            LogisticRegressionResult.objects.create(
                portfolio=portfolio,
                stock=holding.stock,
                points_used=result.points_used,
                positive_days=result.positive_days,
                test_accuracy=result.test_accuracy,
                probability_up_next_close=result.probability_up_next_close,
                signal=result.signal,
                data_source='yfinance',
            )

            predictions.append(
                {
                    'symbol': result.symbol,
                    'points_used': result.points_used,
                    'positive_days': result.positive_days,
                    'test_accuracy': result.test_accuracy,
                    'probability_up_next_close': result.probability_up_next_close,
                    'signal': result.signal,
                    'data_source': 'yfinance',
                }
            )

        return Response(
            {
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'model': 'logistic_regression',
                'predictions': predictions,
                'skipped': skipped,
            }
        )

    @action(detail=True, methods=['POST'], url_path='time-series-forecast')
    def time_series_forecast(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        horizon_days_raw = request.data.get('horizon_days', 1)
        model_type = (request.data.get('model_type') or 'ARIMA').upper().strip()

        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            horizon_days = int(horizon_days_raw)
        except (TypeError, ValueError):
            return Response({'detail': 'horizon_days must be an integer (1 or 7)'}, status=status.HTTP_400_BAD_REQUEST)

        if horizon_days not in (1, 7):
            return Response({'detail': 'horizon_days must be 1 or 7'}, status=status.HTTP_400_BAD_REQUEST)

        if model_type not in ('ARIMA', 'RNN'):
            return Response({'detail': 'model_type must be ARIMA or RNN'}, status=status.HTTP_400_BAD_REQUEST)

        holding = (
            portfolio.holdings
            .select_related('stock')
            .filter(stock__symbol=symbol)
            .first()
        )
        if not holding:
            return Response({'detail': 'Selected stock is not part of this portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        history_raw = get_history(symbol, period='2y', interval='1d') or []
        history = []
        for row in history_raw:
            close_raw = row.get('close_price')
            if close_raw is None:
                continue
            try:
                close_val = float(close_raw)
            except (TypeError, ValueError):
                continue
            if not math.isfinite(close_val):
                continue
            history.append({**row, 'close_price': close_val})

        min_points = 45 if model_type == 'RNN' else 30
        if len(history) < min_points:
            return Response({'detail': f'Need at least {min_points} historical close prices from yfinance'}, status=status.HTTP_400_BAD_REQUEST)

        prices = [h['close_price'] for h in history]
        try:
            if model_type == 'RNN':
                result = forecast_rnn(prices=prices, symbol=symbol)
            else:
                result = forecast_arima(prices=prices, symbol=symbol)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'{model_type} forecast failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        last_date_str = history[-1].get('date')
        try:
            last_date = date.fromisoformat(last_date_str)
        except Exception:
            last_date = date.today()

        future_dates = [d.date().isoformat() for d in pd.bdate_range(start=last_date + timedelta(days=1), periods=7)]
        forecast_7_points = [
            {'date': future_dates[idx], 'predicted_close': result.forecast_7[idx]}
            for idx in range(7)
        ]

        selected_forecast_points = forecast_7_points[:horizon_days]
        selected_prediction = {
            'horizon_days': horizon_days,
            'predicted_close': result.ts_1_close if horizon_days == 1 else result.ts_7_close,
            'predicted_change_percent': result.ts_1_change_percent if horizon_days == 1 else result.ts_7_change_percent,
        }

        history_points = [
            {'date': h['date'], 'close': h['close_price']}
            for h in history[-120:]
        ]

        current_quote = get_live_quote(symbol) or {}
        current_price = current_quote.get('price')
        if current_price is None:
            current_price = result.latest_close

        forecast_record = TimeSeriesForecast.objects.create(
            portfolio=portfolio,
            stock=holding.stock,
            model_name=model_type,
            horizon_days=horizon_days,
            points_used=result.points_used,
            latest_close=result.latest_close,
            predicted_close=selected_prediction['predicted_close'],
            predicted_change_percent=selected_prediction['predicted_change_percent'],
            historical_points=history_points,
            prediction_points=selected_forecast_points,
        )

        return Response(
            {
                'forecast_id': forecast_record.id,
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'symbol': symbol,
                'model': model_type,
                'order': list(result.order) if result.order else None,
                'model_details': result.model_details,
                'points_used': result.points_used,
                'history': history_points,
                'selected_horizon_days': horizon_days,
                'selected_forecast': selected_forecast_points,
                'selected_prediction': selected_prediction,
                'ts_1': {
                    'horizon_days': 1,
                    'predicted_close': result.ts_1_close,
                    'predicted_change_percent': result.ts_1_change_percent,
                },
                'ts_7': {
                    'horizon_days': 7,
                    'predicted_close': result.ts_7_close,
                    'predicted_change_percent': result.ts_7_change_percent,
                },
                'stock_info': {
                    'stock_id': holding.stock.id,
                    'symbol': holding.stock.symbol,
                    'name': holding.stock.name,
                    'sector': holding.stock.sector,
                    'industry': holding.stock.industry,
                    'pe_ratio': holding.stock.pe_ratio,
                    'current_price': current_price,
                    'latest_close': result.latest_close,
                    'week_52_high': holding.stock._52_week_high,
                    'week_52_low': holding.stock._52_week_low,
                },
                'created_at': forecast_record.created_at,
            }
        )

    @action(detail=True, methods=['GET'], url_path='portfolio-clusters')
    def portfolio_clusters(self, request, pk=None):
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler
        from sklearn.decomposition import PCA

        portfolio = self.get_object()
        holdings = portfolio.holdings.select_related('stock').all()

        if not holdings.exists():
            return Response({'detail': 'No holdings in portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        rows = []
        for h in holdings:
            symbol = h.stock.symbol
            history = get_history(symbol, period='1y', interval='1d') or []
            closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
            if len(closes) < 20:
                continue

            prices = np.array(closes, dtype=float)
            returns = np.diff(prices) / prices[:-1]
            ret_1y = float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0
            vol = float(np.std(returns) * np.sqrt(252))
            max_dd = float(np.min((prices / np.maximum.accumulate(prices)) - 1))
            high_52 = float(h.stock._52_week_high) if h.stock._52_week_high else float(np.max(prices))
            low_52 = float(h.stock._52_week_low) if h.stock._52_week_low else float(np.min(prices))
            pos_52 = (prices[-1] - low_52) / (high_52 - low_52) if (high_52 - low_52) > 0 else 0.5

            rows.append({
                'symbol': symbol,
                'name': h.stock.name,
                'ret_1y': round(ret_1y, 4),
                'vol': round(vol, 4),
                'max_drawdown': round(max_dd, 4),
                'pos_52w': round(pos_52, 4),
            })

        if len(rows) < 3:
            return Response({'detail': 'Need at least 3 stocks with sufficient data for clustering'}, status=status.HTTP_400_BAD_REQUEST)

        feature_keys = ['ret_1y', 'vol', 'max_drawdown', 'pos_52w']
        X = np.array([[r[k] for k in feature_keys] for r in rows], dtype=float)
        X_scaled = StandardScaler().fit_transform(X)

        n_clusters = min(3, len(rows))
        kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
        labels = kmeans.fit_predict(X_scaled)

        pca = PCA(n_components=2, random_state=42)
        pca_pts = pca.fit_transform(X_scaled)

        cluster_vols = {}
        for i, row in enumerate(rows):
            cid = int(labels[i])
            cluster_vols.setdefault(cid, []).append(row['vol'])
        avg_vols = {cid: float(np.mean(vols)) for cid, vols in cluster_vols.items()}
        sorted_cids = sorted(avg_vols, key=avg_vols.get, reverse=True)
        risk_labels_list = ['High-Risk', 'Medium-Risk', 'Low-Risk']
        cluster_label_map = {cid: risk_labels_list[i] for i, cid in enumerate(sorted_cids)}

        items = []
        for i, row in enumerate(rows):
            cid = int(labels[i])
            items.append({
                **row,
                'cluster_id': cid,
                'cluster_label': cluster_label_map.get(cid, f'Cluster {cid}'),
                'pca_x': round(float(pca_pts[i, 0]), 4),
                'pca_y': round(float(pca_pts[i, 1]), 4),
            })

        summary = []
        for cid in range(n_clusters):
            group = [r for r in items if r['cluster_id'] == cid]
            if not group:
                continue
            summary.append({
                'cluster_id': cid,
                'cluster_label': cluster_label_map.get(cid, f'Cluster {cid}'),
                'count': len(group),
                'avg_ret_1y': round(float(np.mean([r['ret_1y'] for r in group])), 4),
                'avg_vol': round(float(np.mean([r['vol'] for r in group])), 4),
                'avg_max_drawdown': round(float(np.mean([r['max_drawdown'] for r in group])), 4),
            })

        # ✅ STORE IN DATABASE
        cluster_record = PortfolioClusteringResult.objects.create(
            portfolio=portfolio,
            n_clusters=n_clusters,
            clustering_data=items,
            summary=summary,
            pca_explained_variance=float(pca.explained_variance_ratio_.sum()),
        )

        return Response({
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'n_clusters': n_clusters,
            'items': items,
            'summary': summary,
            'clustering_id': cluster_record.id,
        })

    @action(detail=True, methods=['GET'], url_path='growth-analysis')
    def growth_analysis(self, request, pk=None):
        """3-month statistical growth analysis for all stocks in the portfolio."""
        portfolio = self.get_object()
        holdings = portfolio.holdings.select_related('stock').all()

        if not holdings.exists():
            return Response({'detail': 'No holdings in portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        stock_stats = []
        all_daily_returns = []

        for h in holdings:
            history = get_history(h.stock.symbol, period='3mo', interval='1d') or []
            closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
            if len(closes) < 5:
                continue
            prices = np.array(closes)
            returns = np.diff(prices) / prices[:-1]
            total_return = float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0.0
            stock_stats.append({
                'symbol': h.stock.symbol,
                'total_return': round(total_return * 100, 2),
                'mean_daily_return': round(float(np.mean(returns)) * 100, 4),
                'volatility': round(float(np.std(returns)) * 100, 4),
            })
            all_daily_returns.extend(returns.tolist())

        if not stock_stats:
            return Response({'detail': 'Insufficient historical data for 3-month analysis'}, status=status.HTTP_400_BAD_REQUEST)

        arr = np.array(all_daily_returns)
        rf_daily = 0.06 / 252  # 6% annual risk-free rate
        sharpe = float((np.mean(arr) - rf_daily) / np.std(arr) * np.sqrt(252)) if np.std(arr) != 0 else 0.0

        best = max(stock_stats, key=lambda x: x['total_return'])
        worst = min(stock_stats, key=lambda x: x['total_return'])

        GrowthAnalysis.objects.create(
            portfolio=portfolio,
            period_label='3M',
            mean_return=round(float(np.mean(arr)) * 100, 4),
            std_dev=round(float(np.std(arr)) * 100, 4),
            sharpe_ratio=round(sharpe, 4),
            total_return=round(float(np.mean([s['total_return'] for s in stock_stats])), 4),
            best_stock=best['symbol'],
            worst_stock=worst['symbol'],
        )

        return Response({
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'period': '3 Months',
            'portfolio_mean_daily_return_pct': round(float(np.mean(arr)) * 100, 4),
            'portfolio_std_dev_pct': round(float(np.std(arr)) * 100, 4),
            'annualised_sharpe_ratio': round(sharpe, 4),
            'best_stock': best,
            'worst_stock': worst,
            'stock_breakdown': stock_stats,
        })

    @action(detail=True, methods=['GET'], url_path='portfolio-rating')
    def portfolio_rating(self, request, pk=None):
        """ML-based star rating (1–5 stars) based on portfolio performance signals."""
        portfolio = self.get_object()
        holdings = portfolio.holdings.select_related('stock').all()

        if not holdings.exists():
            return Response({'detail': 'No holdings in portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        scores = []
        for h in holdings:
            history = get_history(h.stock.symbol, period='1y', interval='1d') or []
            closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
            if len(closes) < 35:
                continue

            prices = np.array(closes)
            returns = np.diff(prices) / prices[:-1]
            ret_1y = float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0
            vol = float(np.std(returns) * np.sqrt(252))
            max_dd = float(np.min((prices / np.maximum.accumulate(prices)) - 1))

            # Probability-up via logistic regression signal
            try:
                from .logistic_regression import predict_next_direction
                result = predict_next_direction(closes, symbol=h.stock.symbol)
                prob_up = result.probability_up_next_close
            except Exception:
                prob_up = 0.5

            # Score: weighted sum (return contribution, low volatility, low drawdown, prob_up)
            raw_score = (
                0.30 * min(max(ret_1y, -1), 1) +       # return: clamped [-1, 1]
                0.25 * (1 - min(vol, 1)) +              # inverse volatility
                0.25 * (1 + min(max(max_dd, -1), 0)) +  # inverse max drawdown
                0.20 * prob_up                           # prob up
            )
            scores.append(raw_score)

        if not scores:
            return Response({'detail': 'Insufficient data to rate portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        avg_score = float(np.mean(scores))
        # Normalise to [0, 1]
        norm = (avg_score + 0.5) / 1.5
        norm = max(0.0, min(1.0, norm))
        stars = max(1, min(5, round(1 + norm * 4)))

        labels = {1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent'}
        label = labels[stars]

        PortfolioRating.objects.create(
            portfolio=portfolio,
            score=round(avg_score, 4),
            stars=stars,
            label=label,
        )

        return Response({
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'score': round(avg_score, 4),
            'stars': stars,
            'label': label,
        })

    @action(detail=True, methods=['GET'], url_path='summary-report')
    def summary_report(self, request, pk=None):
        """Text narrative summary of portfolio clustering and performance."""
        portfolio = self.get_object()
        holdings = portfolio.holdings.select_related('stock').all()

        if not holdings.exists():
            return Response({'detail': 'No holdings in portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        rows = []
        for h in holdings:
            history = get_history(h.stock.symbol, period='1y', interval='1d') or []
            closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
            if len(closes) < 20:
                continue
            prices = np.array(closes)
            returns = np.diff(prices) / prices[:-1]
            rows.append({
                'symbol': h.stock.symbol,
                'name': h.stock.name,
                'sector': h.stock.sector or 'Unknown',
                'ret_1y': float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0,
                'vol': float(np.std(returns) * np.sqrt(252)),
            })

        if len(rows) < 2:
            return Response({'detail': 'Need at least 2 stocks with sufficient data'}, status=status.HTTP_400_BAD_REQUEST)

        X = np.array([[r['ret_1y'], r['vol']] for r in rows])
        X_scaled = StandardScaler().fit_transform(X)
        n_clusters = min(3, len(rows))
        labels = KMeans(n_clusters=n_clusters, n_init=10, random_state=42).fit_predict(X_scaled)

        risk_labels = ['High-Risk', 'Medium-Risk', 'Low-Risk']
        cluster_vols = {}
        for i, r in enumerate(rows):
            cid = int(labels[i])
            cluster_vols.setdefault(cid, []).append(r['vol'])
        sorted_cids = sorted(cluster_vols, key=lambda c: float(np.mean(cluster_vols[c])), reverse=True)
        cluster_label_map = {cid: risk_labels[i] for i, cid in enumerate(sorted_cids)}

        groups = {}
        for i, r in enumerate(rows):
            cid = int(labels[i])
            lbl = cluster_label_map.get(cid, 'Unknown')
            groups.setdefault(lbl, []).append(r['symbol'])

        positive = [r for r in rows if r['ret_1y'] > 0]
        negative = [r for r in rows if r['ret_1y'] <= 0]

        lines = [
            f"## Portfolio Summary Report — {portfolio.name}",
            f"",
            f"Your portfolio holds **{len(rows)} stocks** across {len(set(r['sector'] for r in rows))} sectors.",
            f"",
            f"### Cluster Breakdown",
        ]
        for lbl, syms in groups.items():
            lines.append(f"- **{lbl}**: {', '.join(syms)}")

        lines += [
            f"",
            f"### Performance Highlights",
            f"- **{len(positive)} stocks** showed positive 1-year returns.",
            f"- **{len(negative)} stocks** are in the red over the past year.",
        ]

        if rows:
            best = max(rows, key=lambda r: r['ret_1y'])
            worst = min(rows, key=lambda r: r['ret_1y'])
            lines += [
                f"- Best performer: **{best['symbol']}** ({best['ret_1y']*100:.1f}%)",
                f"- Worst performer: **{worst['symbol']}** ({worst['ret_1y']*100:.1f}%)",
            ]

        lines += [
            f"",
            f"### Recommendation",
        ]
        high_risk_syms = groups.get('High-Risk', [])
        if high_risk_syms:
            lines.append(f"⚠️ Consider reviewing high-risk holdings: **{', '.join(high_risk_syms)}**.")
        low_risk_syms = groups.get('Low-Risk', [])
        if low_risk_syms:
            lines.append(f"✅ Stable holdings anchoring your portfolio: **{', '.join(low_risk_syms)}**.")

        # ✅ STORE IN DATABASE
        best = max(rows, key=lambda r: r['ret_1y']) if rows else None
        worst = min(rows, key=lambda r: r['ret_1y']) if rows else None
        
        report_record = PortfolioSummaryReport.objects.create(
            portfolio=portfolio,
            report_text='\n'.join(lines),
            groups=groups,
            positive_count=len(positive),
            negative_count=len(negative),
            best_stock=best['symbol'] if best else '',
            worst_stock=worst['symbol'] if worst else '',
            best_return_percent=best['ret_1y'] * 100 if best else None,
            worst_return_percent=worst['ret_1y'] * 100 if worst else None,
        )

        return Response({
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'report': '\n'.join(lines),
            'groups': groups,
            'report_id': report_record.id,
        })

    @action(detail=True, methods=['GET'], url_path='recommend-stocks')
    def recommend_stocks(self, request, pk=None):
        """Recommend top-quality stocks from one sector only (top 25%)."""
        portfolio = self.get_object()
        holdings = portfolio.holdings.select_related('stock').all()

        if not holdings.exists():
            return Response({'detail': 'No holdings in portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        portfolio_symbols = {h.stock.symbol for h in holdings}
        sectors = sorted({h.stock.sector for h in holdings if h.stock.sector})

        requested_sector = (request.query_params.get('sector') or '').strip()
        requested_market = (request.query_params.get('market') or '').strip()
        focus_sector = requested_sector if requested_sector else (sectors[0] if sectors else '')

        if not requested_sector:
            desc = portfolio.description or ''
            match = re.search(r'in sector:\s*(.*?)\s*\((.*?)\)', desc, flags=re.IGNORECASE)
            if match:
                focus_sector = (match.group(1) or focus_sector).strip()
                if not requested_market:
                    requested_market = (match.group(2) or '').strip()

        if not focus_sector:
            return Response({'detail': 'No sector available for recommendations'}, status=status.HTTP_400_BAD_REQUEST)

        focus_sector_norm = focus_sector.strip().lower()
        candidates = []
        seen = set()

        # Primary: recommend from current portfolio holdings for this same sector.
        holding_candidates = []
        for h in holdings:
            stock_sector_norm = (h.stock.sector or '').strip().lower()
            if stock_sector_norm and stock_sector_norm != focus_sector_norm:
                continue
            symbol = (h.stock.symbol or '').strip().upper()
            if not symbol or symbol in seen:
                continue
            seen.add(symbol)
            holding_candidates.append({
                'symbol': symbol,
                'stock_name': h.stock.name,
                'sector': h.stock.sector or focus_sector,
                'market': requested_market,
                'already_in_portfolio': True,
            })

        # If sector labels are missing in holdings, fallback to all holdings in that portfolio.
        if not holding_candidates:
            for h in holdings:
                symbol = (h.stock.symbol or '').strip().upper()
                if not symbol or symbol in seen:
                    continue
                seen.add(symbol)
                holding_candidates.append({
                    'symbol': symbol,
                    'stock_name': h.stock.name,
                    'sector': h.stock.sector or focus_sector,
                    'market': requested_market,
                    'already_in_portfolio': True,
                })
        elif len(holding_candidates) < 3 and holdings.count() >= 3:
            # Backfill from remaining holdings to always target top-3 picks when portfolio has enough stocks.
            for h in holdings:
                symbol = (h.stock.symbol or '').strip().upper()
                if not symbol or symbol in seen:
                    continue
                seen.add(symbol)
                holding_candidates.append({
                    'symbol': symbol,
                    'stock_name': h.stock.name,
                    'sector': h.stock.sector or focus_sector,
                    'market': requested_market,
                    'already_in_portfolio': True,
                })
                if len(holding_candidates) >= 3:
                    break

        candidates.extend(holding_candidates)

        # Secondary fallback: sector catalog stocks if holdings candidate list is empty.
        if not candidates:
            catalog_qs = StockCatalog.objects.all()
            if requested_market:
                catalog_qs = catalog_qs.filter(market__iexact=requested_market)
            for row in catalog_qs.order_by('stock_name', 'symbol'):
                row_sector = (row.sector or '').strip().lower()
                if row_sector != focus_sector_norm:
                    continue
                symbol = (row.symbol or '').strip().upper()
                if not symbol or symbol in seen:
                    continue
                seen.add(symbol)
                candidates.append({
                    'symbol': symbol,
                    'stock_name': row.stock_name,
                    'sector': row.sector,
                    'market': row.market,
                    'already_in_portfolio': symbol in portfolio_symbols,
                })

        def _safe_float(v):
            try:
                n = float(v)
            except (TypeError, ValueError):
                return None
            return n if math.isfinite(n) else None

        def _clamp(v, lo=0.0, hi=1.0):
            return max(lo, min(hi, v))

        def _pe_score(pe):
            if pe is None:
                return 0.45
            if pe <= 0:
                return 0.20
            if pe < 8:
                return 0.55
            if pe <= 35:
                return _clamp(1 - abs(pe - 22) / 22)
            if pe <= 65:
                return 0.35
            return 0.20

        def _size_score(market_cap):
            if market_cap is None or market_cap <= 0:
                return 0.40
            return _clamp((math.log10(market_cap) - 8.0) / 4.0)

        scored = []
        for c in candidates[:40]:
            symbol = c['symbol']
            profile = get_stock_profile(symbol) or {}
            quote = get_live_quote(symbol) or {}
            history = get_history(symbol, period='1y', interval='1d') or []

            closes = []
            for row in history:
                close_price = _safe_float(row.get('close_price'))
                if close_price is not None:
                    closes.append(close_price)

            one_year_return = None
            annual_volatility = None
            if len(closes) >= 30 and closes[0] > 0:
                prices = np.array(closes, dtype=float)
                one_year_return = float((prices[-1] / prices[0]) - 1)
                returns = np.diff(prices) / prices[:-1]
                if len(returns) > 1:
                    annual_volatility = float(np.std(returns) * np.sqrt(252))

            pe_ratio = _safe_float(profile.get('pe_ratio'))
            market_cap = _safe_float(profile.get('market_cap'))
            dividend_yield = _safe_float(profile.get('dividend_yield'))

            return_score = _clamp(((one_year_return or 0.0) + 0.2) / 0.6)
            volatility_score = _clamp(1 - ((annual_volatility or 0.45) / 0.65))
            pe_score = _pe_score(pe_ratio)
            size_score = _size_score(market_cap)
            dividend_score = _clamp((dividend_yield or 0.0) / 4.0)

            quality = (
                0.38 * return_score +
                0.24 * volatility_score +
                0.18 * pe_score +
                0.14 * size_score +
                0.06 * dividend_score
            )

            if quality >= 0.68 and (one_year_return or 0.0) >= 0 and (annual_volatility or 0.45) <= 0.40:
                signal = 'BUY'
            elif quality >= 0.52:
                signal = 'WATCH'
            else:
                signal = 'AVOID'

            scored.append({
                'symbol': symbol,
                'name': profile.get('name') or c['stock_name'] or symbol,
                'sector': c['sector'] or focus_sector,
                'market': c['market'] or requested_market,
                'already_in_portfolio': bool(c.get('already_in_portfolio')),
                'current_price': _safe_float(quote.get('price')),
                'pe_ratio': pe_ratio,
                'market_cap': market_cap,
                'dividend_yield': dividend_yield,
                'one_year_return_pct': round((one_year_return or 0.0) * 100, 2),
                'annual_volatility_pct': round((annual_volatility or 0.0) * 100, 2),
                'quality_score': round(quality * 100, 2),
                'signal': signal,
                'worth_buy': signal == 'BUY',
            })

        scored.sort(key=lambda x: (x['one_year_return_pct'], x['quality_score']), reverse=True)
        top_count = min(3, len(scored))
        recommendations = []
        for item in scored[:top_count]:
            recommendations.append({
                **item,
                'reason': (
                    f"Top return pick in {focus_sector}. "
                    f"1Y return {item['one_year_return_pct']:.2f}% and score {item['quality_score']:.2f}/100."
                ),
            })

        rec_record = PortfolioRecommendations.objects.create(
            portfolio=portfolio,
            reason=f'Sector quality recommendations for {focus_sector}',
            recommendations=recommendations,
            portfolio_sectors=[focus_sector],
        )

        return Response({
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'portfolio_sectors': [focus_sector],
            'focus_sector': focus_sector,
            'market': requested_market,
            'candidate_count': len(candidates),
            'selected_count': len(recommendations),
            'recommendations': recommendations,
            'recommendation_id': rec_record.id,
        })
