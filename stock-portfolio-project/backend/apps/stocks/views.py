from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.db.utils import OperationalError, ProgrammingError
from django.http import HttpResponse, StreamingHttpResponse
from django.core.cache import cache
from django.conf import settings
from collections import defaultdict
import csv
import json
import re
import math
from decimal import Decimal
from .models import Stock, StockCatalog, StockUniverse
from .serializers import StockSerializer, StockCatalogSerializer, StockUniverseSerializer
from services.stock_service import get_live_quote, get_history, search_symbols, get_stock_profile
from apps.ml_analytics.models import StockSentimentAnalysis, PortfolioRecommendations
from apps.portfolio.models import Portfolio, PortfolioStock


class ChatProviderError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def _normalize_model_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'text' and isinstance(item.get('text'), str):
                parts.append(item['text'])
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(p for p in parts if p).strip()
    return ""


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all().order_by('symbol')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

@api_view(['GET'])
@permission_classes([AllowAny])
def stocks_search(request):
    q = request.query_params.get('q', '')
    qs = Stock.objects.filter(Q(symbol__icontains=q) | Q(name__icontains=q))[:20]
    return Response(StockSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def stock_catalog_list(request):
    market = (request.query_params.get('market') or '').strip()
    qs = StockCatalog.objects.all()
    if market:
        qs = qs.filter(market__iexact=market)
    return Response(StockCatalogSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def recommended_portfolios(request):
    market_param = (request.query_params.get('market') or '').strip()
    qs = StockCatalog.objects.all()
    if market_param:
        qs = qs.filter(market__iexact=market_param)

    grouped = defaultdict(lambda: defaultdict(list))
    for row in qs:
        grouped[row.market][row.sector].append({
            'stock_name': row.stock_name,
            'symbol': row.symbol,
            'sector': row.sector,
            'market': row.market,
        })

    markets = []
    for market_name in sorted(grouped.keys(), key=lambda m: m.lower()):
        sector_items = grouped[market_name]
        sectors = []
        for sector_name in sorted(sector_items.keys(), key=lambda s: s.lower()):
            stocks = sorted(sector_items[sector_name], key=lambda item: item['stock_name'].lower())
            sectors.append({
                'sector': sector_name,
                'count': len(stocks),
                'stocks': stocks,
            })
        markets.append({
            'market': market_name,
            'sector_count': len(sectors),
            'stock_count': sum(s['count'] for s in sectors),
            'sectors': sectors,
        })

    return Response({
        'total_markets': len(markets),
        'total_stocks': qs.count(),
        'markets': markets,
    })


def _safe_float(value):
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if math.isfinite(num) else None


def _resolve_symbol_return_stats(symbol, symbol_stats):
    existing = symbol_stats.get(symbol, {})
    one_year_return_pct = _safe_float(existing.get('one_year_return_pct'))
    current_price = _safe_float(existing.get('current_price'))
    signal = str(existing.get('signal') or '').upper().strip()

    if one_year_return_pct is None:
        history = get_history(symbol, period='1y', interval='1wk') or []
        closes = []
        for item in history:
            close_val = _safe_float(item.get('close_price'))
            if close_val is not None:
                closes.append(close_val)

        if len(closes) >= 2 and closes[0] > 0:
            one_year_return_pct = ((closes[-1] / closes[0]) - 1.0) * 100.0
            if current_price is None:
                current_price = closes[-1]
        else:
            one_year_return_pct = 0.0

    if signal not in {'BUY', 'WATCH', 'HOLD', 'AVOID', 'SELL'}:
        signal = 'BUY' if one_year_return_pct > 0 else 'HOLD'

    # Memoize per request so repeated symbols don't trigger duplicate history calls.
    symbol_stats[symbol] = {
        'one_year_return_pct': one_year_return_pct,
        'current_price': current_price,
        'signal': signal,
    }
    return symbol_stats[symbol]


def _build_shared_recommendations_for_sector(market_label, sector_name, catalog_rows, symbol_stats=None):
    symbol_stats = symbol_stats or {}

    picks = []
    seen = set()
    for row in catalog_rows:
        symbol = (row.symbol or '').strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        picks.append(row)
        if len(picks) >= 3:
            break

    recommendations = []
    for row in picks:
        symbol = (row.symbol or '').strip().upper()
        stats = _resolve_symbol_return_stats(symbol, symbol_stats)
        one_year_return_pct = _safe_float(stats.get('one_year_return_pct')) or 0.0
        current_price = _safe_float(stats.get('current_price'))
        signal = str(stats.get('signal') or 'HOLD').upper().strip()

        recommendations.append({
            'symbol': symbol,
            'name': row.stock_name or symbol,
            'sector': sector_name,
            'market': market_label,
            'current_price': current_price,
            'one_year_return_pct': round(one_year_return_pct, 2),
            'worth_buy': signal == 'BUY',
            'signal': signal,
            'reason': (
                f"Top pick in {sector_name}. "
                f"1Y return {one_year_return_pct:.2f}% based on latest shared analytics."
            ),
        })

    return recommendations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quality_recommendations(request):
    market_param = (request.query_params.get('market') or '').strip()
    cache_suffix = market_param.lower() if market_param else 'all'
    cache_key = f"quality_recommendations:v4:{cache_suffix}"

    cached_response = cache.get(cache_key)
    if cached_response is not None:
        return Response(cached_response)

    # Reuse latest recommendation stats globally so all users see identical results quickly.
    symbol_stats = {}
    latest_recs = PortfolioRecommendations.objects.order_by('-created_at')[:200]
    for rec in latest_recs:
        entries = rec.recommendations if isinstance(rec.recommendations, list) else []
        for item in entries:
            if not isinstance(item, dict):
                continue
            symbol = (item.get('symbol') or '').strip().upper()
            if not symbol or symbol in symbol_stats:
                continue
            symbol_stats[symbol] = {
                'one_year_return_pct': item.get('one_year_return_pct'),
                'current_price': item.get('current_price'),
                'signal': item.get('signal'),
            }

    catalog_qs = StockCatalog.objects.all()
    if market_param:
        catalog_qs = catalog_qs.filter(market__iexact=market_param)

    catalog_rows = list(catalog_qs.only('market', 'sector', 'symbol', 'stock_name').order_by('market', 'sector', 'stock_name'))
    sectors_by_market = defaultdict(lambda: defaultdict(list))
    for row in catalog_rows:
        market_name = (row.market or '').strip()
        sector_name = (row.sector or '').strip()
        if market_name and sector_name:
            sectors_by_market[market_name][sector_name].append(row)

    response_markets = []
    for market_name in sorted(sectors_by_market.keys(), key=lambda m: m.lower()):
        sector_rows = []
        for sector_name in sorted(sectors_by_market[market_name], key=lambda s: s.lower()):
            sector_catalog_rows = sectors_by_market[market_name][sector_name]
            recommendations = _build_shared_recommendations_for_sector(
                market_label=market_name,
                sector_name=sector_name,
                catalog_rows=sector_catalog_rows,
                symbol_stats=symbol_stats,
            )

            sector_rows.append({
                'sector': sector_name,
                'market': market_name,
                'portfolio_id': None,
                'selected_count': len(recommendations),
                'recommendations': recommendations,
                'from_db': False,
            })

        response_markets.append({
            'market': market_name,
            'sector_count': len(sector_rows),
            'sectors': sector_rows,
        })

    response_payload = {
        'total_markets': len(response_markets),
        'markets': response_markets,
    }

    # Shared cache so all users get the same precomputed quality cards.
    cache.set(cache_key, response_payload, 3600)
    return Response(response_payload)

@api_view(['GET'])
@permission_classes([AllowAny])
def live_search(request):
    q = request.query_params.get('q', '')
    limit = int(request.query_params.get('limit', 10))
    results = search_symbols(q, limit=limit)
    return Response(results)

@api_view(['GET'])
@permission_classes([AllowAny])
def live_detail(request):
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)
    live_data = get_live_quote(symbol)
    profile_data = get_stock_profile(symbol)
    if not live_data and not profile_data:
        return Response({'detail': 'no data'}, status=status.HTTP_404_NOT_FOUND)
    return Response({**(profile_data or {}), **(live_data or {})})

@api_view(['GET'])
@permission_classes([AllowAny])
def historical(request):
    symbol = request.query_params.get('symbol')
    period = request.query_params.get('period', '1y')
    interval = request.query_params.get('interval', '1d')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)
    data = get_history(symbol, period=period, interval=interval)
    return Response({'symbol': symbol, 'period': period, 'interval': interval, 'prices': data})


@api_view(['GET'])
@permission_classes([AllowAny])
def stock_universe(request):
    market = (request.query_params.get('market') or '').strip().upper()
    include_inactive = (request.query_params.get('include_inactive') or '').strip() in {'1', 'true', 'True'}

    try:
        qs = StockUniverse.objects.all()
        if market in {StockUniverse.MARKET_IN, StockUniverse.MARKET_US}:
            qs = qs.filter(market=market)
        if not include_inactive:
            qs = qs.filter(is_active=True)
        qs = qs.order_by('market', 'display_order', 'symbol')
        data = StockUniverseSerializer(qs, many=True).data
    except (OperationalError, ProgrammingError):
        data = []

    return Response({
        'count': len(data),
        'results': data,
        'symbols': [row['symbol'] for row in data],
    })


# ─── SENTIMENT ANALYSIS ──────────────────────────────────────────────────────

POSITIVE_WORDS = {
    'rise', 'rises', 'rising', 'gain', 'gains', 'profit', 'profits', 'growth', 'surge',
    'surges', 'rally', 'rallies', 'beat', 'beats', 'outperform', 'upgrade', 'buy',
    'bullish', 'positive', 'record', 'high', 'strong', 'target', 'upside', 'boost',
    'improved', 'expansion', 'dividend', 'acquisition',
}
NEGATIVE_WORDS = {
    'fall', 'falls', 'falling', 'loss', 'losses', 'decline', 'declines', 'drop', 'drops',
    'crash', 'plunge', 'sell', 'bearish', 'downgrade', 'negative', 'weak', 'miss',
    'misses', 'below', 'concern', 'debt', 'risk', 'cut', 'layoff', 'fraud', 'lawsuit',
    'penalty', 'warning', 'recession', 'inflation',
}

def _score_text(text):
    words = set(text.lower().split())
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    if pos > neg:
        return 'positive', pos - neg
    elif neg > pos:
        return 'negative', neg - pos
    return 'neutral', 0

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_sentiment(request):
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        news_items = ticker.news or []
    except Exception as e:
        return Response({'detail': f'Could not fetch news: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

    sentiment_results = []
    pos_count = neg_count = neu_count = 0

    for item in news_items[:15]:
        content = item.get('content', {})
        title = content.get('title', '') if isinstance(content, dict) else str(content)
        summary = ''
        if isinstance(content, dict):
            summary = content.get('summary', '') or ''
        text = f"{title} {summary}"
        sentiment, strength = _score_text(text)
        if sentiment == 'positive':
            pos_count += 1
        elif sentiment == 'negative':
            neg_count += 1
        else:
            neu_count += 1

        pub_date = ''
        try:
            pub_date = content.get('pubDate', '') if isinstance(content, dict) else ''
        except Exception:
            pass

        sentiment_results.append({
            'title': title,
            'sentiment': sentiment,
            'strength': strength,
            'pub_date': pub_date,
            'url': content.get('canonicalUrl', {}).get('url', '') if isinstance(content, dict) else '',
        })

    total = len(sentiment_results) or 1
    overall = 'neutral'
    if pos_count > neg_count and pos_count / total > 0.4:
        overall = 'positive'
    elif neg_count > pos_count and neg_count / total > 0.4:
        overall = 'negative'

    try:
        stock = Stock.objects.get(symbol=symbol)
        sentiment_score = pos_count - neg_count
        StockSentimentAnalysis.objects.create(
            stock=stock,
            overall_sentiment=overall.upper(),
            positive_count=pos_count,
            negative_count=neg_count,
            neutral_count=neu_count,
            sentiment_score=sentiment_score,
            news_breakdown=sentiment_results,
        )
    except Stock.DoesNotExist:
        pass

    return Response({
        'symbol': symbol,
        'overall_sentiment': overall,
        'positive_count': pos_count,
        'negative_count': neg_count,
        'neutral_count': neu_count,
        'news': sentiment_results,
    })


# ─── 5-YEAR PERFORMANCE ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_performance_5y(request):
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)

    data = get_history(symbol, period='5y', interval='1mo') or []
    prices = [
        {'date': r['date'], 'close': float(r['close_price'])}
        for r in data
        if r.get('close_price') is not None
    ]

    if not prices:
        return Response({'detail': 'No historical data available'}, status=status.HTTP_404_NOT_FOUND)

    first_close = prices[0]['close']
    last_close = prices[-1]['close']
    total_return_pct = ((last_close - first_close) / first_close * 100) if first_close else 0

    return Response({
        'symbol': symbol,
        'period': '5Y',
        'interval': '1mo',
        'total_return_pct': round(total_return_pct, 2),
        'prices': prices,
    })


# ─── DOWNLOAD STOCK SUMMARY ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_summary_download(request):
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)

    profile = get_stock_profile(symbol) or {}
    quote = get_live_quote(symbol) or {}
    history_1y = get_history(symbol, period='1y', interval='1d') or []
    closes_1y = [float(r['close_price']) for r in history_1y if r.get('close_price') is not None]

    import numpy as np
    prices_arr = np.array(closes_1y) if closes_1y else None
    returns_arr = np.diff(prices_arr) / prices_arr[:-1] if prices_arr is not None and len(prices_arr) > 1 else None

    volatility = round(float(np.std(returns_arr) * np.sqrt(252) * 100), 2) if returns_arr is not None else None
    ret_1y = round(float((prices_arr[-1] / prices_arr[0] - 1) * 100), 2) if prices_arr is not None and len(prices_arr) > 1 else None

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{symbol}_summary.csv"'

    writer = csv.writer(response)
    writer.writerow(['Field', 'Value'])
    writer.writerow(['Symbol', symbol])
    writer.writerow(['Name', profile.get('name', '')])
    writer.writerow(['Sector', profile.get('sector', '')])
    writer.writerow(['Industry', profile.get('industry', '')])
    writer.writerow(['Current Price', quote.get('price', '')])
    writer.writerow(['Market Cap', profile.get('market_cap', '')])
    writer.writerow(['P/E Ratio', profile.get('pe_ratio', '')])
    writer.writerow(['Dividend Yield', profile.get('dividend_yield', '')])
    writer.writerow(['52-Week High', profile.get('52_week_high', '')])
    writer.writerow(['52-Week Low', profile.get('52_week_low', '')])
    writer.writerow(['1Y Return (%)', ret_1y])
    writer.writerow(['1Y Volatility (Ann. %)', volatility])
    writer.writerow(['Day High', quote.get('day_high', '')])
    writer.writerow(['Day Low', quote.get('day_low', '')])
    writer.writerow(['Volume', quote.get('volume', '')])

    return response


# ─── CHATBOT ─────────────────────────────────────────────────────────────────

GUEST_SYSTEM_PROMPT = (
    "You are Stockly Assistant, an expert stock market advisor. "
    "You help users understand stocks, market trends, SIPs, mutual funds, and investing basics. "
    "Answer in a friendly and concise manner. "
    "Use Indian market context - NSE, BSE, and INR currency. "
    "You do NOT have access to this user's personal portfolio. "
    "They are browsing as a guest. "
    "When asked about their portfolio or personal holdings, politely tell them to log in for personalized insights. "
    "Never make definitive buy or sell recommendations. "
    "Always remind users to consult a SEBI-registered financial advisor."
)


def _sse_chunk(text):
    # IMPORTANT: must use real newlines, not escaped \\n
    return "data: " + json.dumps({"text": text}) + "\n\n"


def _sse_done():
    # IMPORTANT: must use real newlines, not escaped \\n
    return "data: [DONE]\n\n"


def _client_ip(request):
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    return forwarded or request.META.get('REMOTE_ADDR', 'unknown')


def _check_rate_limit(request):
    if request.user.is_authenticated:
        limit = 60
        key = f"chat_rate:user:{request.user.id}"
    else:
        limit = 20
        key = f"chat_rate:ip:{_client_ip(request)}"

    count = cache.get(key)
    if count is None:
        cache.set(key, 1, timeout=60)
        return True, None
    if count >= limit:
        return False, limit
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, count + 1, timeout=60)
    return True, None


def _dec(v):
    if v is None:
        return Decimal('0')
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _fmt_inr(v):
    return f"INR {_dec(v):,.2f}"


def _latest_price_for_holding(holding):
    quote = get_live_quote(holding.stock.symbol) or {}
    live_price = quote.get('price')
    if live_price is not None:
        return _dec(live_price)

    latest_stored = holding.stock.prices.order_by('-date').first()
    if latest_stored:
        return _dec(latest_stored.close_price)
    return _dec(holding.purchase_price)


def _build_personalized_prompt(user):
    # Exclude recommended/template portfolios — their names end with
    # "(indian stock)" or "(global stock)". Only show user-created portfolios.
    TEMPLATE_SUFFIXES = ('(indian stock)', '(global stock)', '(us stock)')

    user_portfolios = Portfolio.objects.filter(user=user)
    real_portfolios = [
        p for p in user_portfolios
        if not any(p.name.lower().endswith(s) for s in TEMPLATE_SUFFIXES)
    ]
    real_portfolio_ids = [p.id for p in real_portfolios]

    holdings_qs = (
        PortfolioStock.objects
        .filter(portfolio__id__in=real_portfolio_ids)
        .select_related('portfolio', 'stock')
        .prefetch_related('stock__prices')
        .order_by('portfolio__name', 'stock__symbol')
    )
    # Cap at 15 holdings — real portfolios will be small
    holdings = list(holdings_qs[:15])

    header_portfolios = ", ".join(p.name for p in real_portfolios[:5]) if real_portfolios else "None"

    # Keep prompt short — every token counts on free tier
    lines = [
        "You are Stockly Assistant, a concise personal stock advisor.",
        "Use NSE/BSE and INR. No definitive buy/sell calls.",
        "End each reply with: Informational only, not financial advice.",
        f"Portfolios: {header_portfolios}.",
    ]

    if not holdings:
        lines.append("User has no holdings yet. Help them build a starter portfolio.")
    else:
        lines.append("Holdings (up to 10):")
        total_value = Decimal('0')
        total_cost = Decimal('0')
        for h in holdings:
            qty = _dec(h.quantity)
            avg_buy = _dec(h.purchase_price)
            current = _latest_price_for_holding(h)
            value = qty * current
            cost = qty * avg_buy
            pnl = value - cost
            pnl_pct = (pnl / cost * Decimal('100')) if cost > 0 else Decimal('0')
            total_value += value
            total_cost += cost
            # Compact format saves ~50% tokens vs verbose format
            lines.append(
                f"{h.stock.symbol}: {int(qty)}qty "
                f"avg=INR{avg_buy:.0f} cur=INR{current:.0f} "
                f"PnL=INR{pnl:.0f}({pnl_pct:.1f}%)"
            )

        total_pnl = total_value - total_cost
        total_pnl_pct = (total_pnl / total_cost * Decimal('100')) if total_cost > 0 else Decimal('0')
        lines.append(
            f"Total: invested=INR{total_cost:.0f} "
            f"value=INR{total_value:.0f} "
            f"PnL=INR{total_pnl:.0f}({total_pnl_pct:.1f}%)"
        )

    # Last 3 transactions only (not 5) to save tokens
    recent = list(holdings_qs.order_by('-purchase_date', '-id')[:3])
    if recent:
        lines.append("Recent trades:")
        for item in recent:
            date_text = str(item.purchase_date)[:10] if item.purchase_date else "N/A"
            lines.append(
                f"{date_text}: {item.stock.symbol} "
                f"x{item.quantity} @INR{_dec(item.purchase_price):.0f}"
            )

    return "\n".join(lines)


def _sanitize_messages(raw_messages):
    cleaned = []
    if not isinstance(raw_messages, list):
        return cleaned
    for item in raw_messages:
        if not isinstance(item, dict):
            continue
        role = item.get('role')
        content = item.get('content')
        if role not in {'user', 'assistant', 'system'}:
            continue
        if not isinstance(content, str):
            continue
        text = content.strip()
        if not text:
            continue
        cleaned.append({'role': role, 'content': text})
    return cleaned



def _trim_messages_for_groq(messages):
    """Keep system prompt + last 6 turns to stay under 6000 TPM free tier limit."""
    system_msgs = [m for m in messages if m.get('role') == 'system']
    conv_msgs   = [m for m in messages if m.get('role') != 'system']
    return system_msgs + (conv_msgs[-6:] if len(conv_msgs) > 6 else conv_msgs)


def _call_groq(messages):
    try:
        from groq import Groq
    except ImportError as exc:
        raise ChatProviderError(f"Groq package not installed. Run: pip install groq. Error: {exc}", status_code=503)

    groq_key = getattr(settings, 'GROQ_API_KEY', None)
    if not groq_key:
        raise ChatProviderError("GROQ_API_KEY not set in settings.", status_code=503)

    client = Groq(api_key=groq_key)
    trimmed = _trim_messages_for_groq(messages)
    try:
        completion = client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=trimmed,
            temperature=0.4,
            max_tokens=600,   # short responses stay under free TPM limit
        )
        text = _normalize_model_text(completion.choices[0].message.content)
        if not text:
            raise ChatProviderError("Groq returned an empty response.", status_code=502)
        return text
    except ChatProviderError:
        raise
    except Exception as exc:
        raise ChatProviderError(f"Groq error: {str(exc)}", status_code=502)



def _call_openrouter(messages):
    import requests as req

    or_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if not or_key:
        raise ChatProviderError("OPENROUTER_API_KEY not set in settings.", status_code=503)

    headers = {
        'Authorization': f"Bearer {or_key}",
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Stockly-AI',
    }

    # Use free-tier models — no billing required
    # These slugs are verified active on OpenRouter as of 2025
    free_models = [
        'meta-llama/llama-3.1-8b-instruct:free',
        'meta-llama/llama-3-8b-instruct:free',
        'google/gemma-3-4b-it:free',
        'microsoft/phi-3-mini-128k-instruct:free',
    ]

    last_error = "No models tried."
    for model in free_models:
        payload = {
            'model': model,
            'messages': messages,
            'temperature': 0.4,
            'max_tokens': 1024,
        }
        try:
            response = req.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=60,
            )
            if response.status_code == 402:
                last_error = f"402 Payment Required for {model}"
                continue
            if response.status_code >= 400:
                last_error = f"HTTP {response.status_code} for {model}: {response.text[:200]}"
                continue

            data = response.json()
            raw_content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            text = _normalize_model_text(raw_content)
            if not text:
                last_error = f"Empty response from {model}"
                continue
            return text

        except Exception as exc:
            last_error = f"Exception for {model}: {str(exc)}"
            continue

    raise ChatProviderError(
        f"All OpenRouter models failed. Last error: {last_error}",
        status_code=502,
    )


def _generate_reply(messages):
    errors = []

    groq_key = getattr(settings, 'GROQ_API_KEY', None)
    if groq_key:
        try:
            return _call_groq(messages)
        except ChatProviderError as exc:
            errors.append(f"Groq: {str(exc)}")
    else:
        errors.append("Groq: GROQ_API_KEY not configured.")

    or_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if or_key:
        try:
            return _call_openrouter(messages)
        except ChatProviderError as exc:
            errors.append(f"OpenRouter: {str(exc)}")
    else:
        errors.append("OpenRouter: OPENROUTER_API_KEY not configured.")

    raise ChatProviderError(" | ".join(errors), status_code=503)


def _tokenize_for_streaming(text):
    if not text:
        return []
    tokens = []
    current = []
    for ch in text:
        current.append(ch)
        if ch in {' ', '\n', '\t'}:
            tokens.append(''.join(current))
            current = []
    if current:
        tokens.append(''.join(current))
    return tokens


@api_view(['POST'])
@permission_classes([AllowAny])
def chat_stream(request):
    allowed, limit = _check_rate_limit(request)
    if not allowed:
        return Response(
            {'detail': f'Rate limit exceeded. Limit: {limit} requests per minute.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    raw_messages = request.data.get('messages', [])
    messages = _sanitize_messages(raw_messages)
    if not messages:
        return Response({'detail': 'messages must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.is_authenticated:
        system_prompt = _build_personalized_prompt(request.user)
    else:
        system_prompt = GUEST_SYSTEM_PROMPT

    model_messages = [{'role': 'system', 'content': system_prompt}] + messages

    groq_key = getattr(settings, 'GROQ_API_KEY', None)
    or_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if not groq_key and not or_key:
        return Response(
            {'detail': 'At least one chat provider key (GROQ_API_KEY or OPENROUTER_API_KEY) must be configured.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        reply_text = _generate_reply(model_messages)
    except ChatProviderError as exc:
        code = exc.status_code if exc.status_code else status.HTTP_502_BAD_GATEWAY
        return Response({'detail': f'Chat provider error: {str(exc)}'}, status=code)
    except Exception as exc:
        return Response({'detail': f'Chat provider error: {str(exc)}'}, status=status.HTTP_502_BAD_GATEWAY)

    def event_stream():
        for token in _tokenize_for_streaming(reply_text):
            yield _sse_chunk(token)
        yield _sse_done()

    streaming_response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    streaming_response['Cache-Control'] = 'no-cache'
    streaming_response['X-Accel-Buffering'] = 'no'
    return streaming_response
