from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.db.utils import OperationalError, ProgrammingError
from django.http import HttpResponse
from collections import defaultdict
import csv
import urllib.request
import urllib.error
from .models import Stock, StockCatalog, StockUniverse
from .serializers import StockSerializer, StockCatalogSerializer, StockUniverseSerializer
from services.stock_service import get_live_quote, get_history, search_symbols, get_stock_profile
from apps.ml_analytics.models import StockSentimentAnalysis

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


# â”€â”€â”€ SENTIMENT ANALYSIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Simple keyword-based polarity sentiment (no external NLP library)
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
    """Keyword-based sentiment from stock news via yfinance."""
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

    # ✅ STORE IN DATABASE
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
        pass  # Stock not in database, but sentiment is still returned

    return Response({
        'symbol': symbol,
        'overall_sentiment': overall,
        'positive_count': pos_count,
        'negative_count': neg_count,
        'neutral_count': neu_count,
        'news': sentiment_results,
    })


# â”€â”€â”€ 5-YEAR PERFORMANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_performance_5y(request):
    """Returns monthly close prices for the last 5 years for charting."""
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


# â”€â”€â”€ DOWNLOAD STOCK SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_summary_download(request):
    """Download a CSV summary of a stock's key metrics."""
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


# â”€â”€â”€ GEMINI AI PROXY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@api_view(['POST'])
@permission_classes([AllowAny])
def gemini_proxy(request):
    """
    Proxy POST /api/stocks/gemini/ â†’ Gemini REST API.
    Body: { "contents": [...], "system_prompt": "..." }
    Returns: { "reply": "..." }
    """
    import urllib.request
    import json as _json
    from django.conf import settings as _settings

    api_key = getattr(_settings, 'GEMINI_API_KEY', '')
    model_name = getattr(_settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
    if not api_key:
        return Response({'detail': 'Gemini API key not configured on server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    contents = request.data.get('contents', [])
    system_prompt = request.data.get('system_prompt', '')

    payload = {'contents': contents}
    if system_prompt:
        payload['system_instruction'] = {'parts': [{'text': system_prompt}]}

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'

    try:
        req = urllib.request.Request(
            url,
            data=_json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = _json.loads(resp.read().decode('utf-8'))

        reply = (
            data.get('candidates', [{}])[0]
            .get('content', {})
            .get('parts', [{}])[0]
            .get('text', '')
        )
        if not reply:
            return Response({'detail': 'Empty Gemini response', 'raw': data}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'reply': reply})

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        if e.code == 429:
            retry_after = e.headers.get('Retry-After')
            payload = {
                'detail': 'Gemini rate limit hit. Please retry after a short delay.',
                'error': body,
            }
            if retry_after:
                payload['retry_after_seconds'] = retry_after
            return Response(
                payload,
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        if e.code == 403:
            return Response(
                {
                    'detail': 'Gemini request forbidden (HTTP 403). Check GEMINI_API_KEY, ensure Generative Language API is enabled, and verify API key restrictions/billing in Google AI Studio/Cloud.',
                    'error': body,
                },
                status=status.HTTP_502_BAD_GATEWAY
            )
        return Response({'detail': f'Gemini error (HTTP {e.code})', 'error': body}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)


