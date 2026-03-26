from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StockViewSet, stocks_search, live_search, live_detail, historical,
    stock_sentiment, stock_performance_5y, stock_summary_download, chat_stream,
    stock_catalog_list, recommended_portfolios, stock_universe, quality_recommendations
)

router = DefaultRouter()
router.register('stocks', StockViewSet, basename='stocks')

urlpatterns = [
    path('stocks/search/', stocks_search),
    path('stocks/search', stocks_search),
    path('stocks/catalog/', stock_catalog_list),
    path('stocks/catalog', stock_catalog_list),
    path('stocks/recommended-portfolios/', recommended_portfolios),
    path('stocks/recommended-portfolios', recommended_portfolios),
    path('stocks/quality-recommendations/', quality_recommendations),
    path('stocks/quality-recommendations', quality_recommendations),
    path('stocks/live-search/', live_search),
    path('stocks/live-search', live_search),
    path('stocks/live-detail/', live_detail),
    path('stocks/live-detail', live_detail),
    path('stocks/historical/', historical),
    path('stocks/historical', historical),
    path('stocks/universe/', stock_universe),
    path('stocks/universe', stock_universe),
    path('stocks/sentiment/', stock_sentiment),
    path('stocks/performance-5y/', stock_performance_5y),
    path('stocks/download-summary/', stock_summary_download),
    path('chat/', chat_stream),
    path('', include(router.urls)),
]
