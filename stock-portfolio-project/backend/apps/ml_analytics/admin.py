from django.contrib import admin
from .models import (
    LinearRegressionResult,
    LogisticRegressionResult,
    PortfolioClusteringResult,
    PortfolioSummaryReport,
    NiftyClustering,
    GoldSilverCorrelation,
    StockSentimentAnalysis,
    PortfolioRecommendations,
)


@admin.register(LinearRegressionResult)
class LinearRegressionResultAdmin(admin.ModelAdmin):
    list_display = ['portfolio', 'stock', 'latest_close', 'predicted_next_close', 'predicted_change_percent', 'created_at']
    list_filter = ['created_at', 'portfolio']
    search_fields = ['portfolio__name', 'stock__symbol']
    readonly_fields = ['created_at']


@admin.register(LogisticRegressionResult)
class LogisticRegressionResultAdmin(admin.ModelAdmin):
    list_display = ['portfolio', 'stock', 'probability_up_next_close', 'signal', 'test_accuracy', 'created_at']
    list_filter = ['created_at', 'portfolio', 'signal']
    search_fields = ['portfolio__name', 'stock__symbol']
    readonly_fields = ['created_at']


@admin.register(PortfolioClusteringResult)
class PortfolioClusteringResultAdmin(admin.ModelAdmin):
    list_display = ['portfolio', 'n_clusters', 'pca_explained_variance', 'created_at']
    list_filter = ['created_at', 'portfolio', 'n_clusters']
    search_fields = ['portfolio__name']
    readonly_fields = ['created_at']


@admin.register(PortfolioSummaryReport)
class PortfolioSummaryReportAdmin(admin.ModelAdmin):
    list_display = ['portfolio', 'positive_count', 'negative_count', 'best_stock', 'worst_stock', 'created_at']
    list_filter = ['created_at', 'portfolio']
    search_fields = ['portfolio__name', 'report_text']
    readonly_fields = ['created_at', 'report_text']


@admin.register(NiftyClustering)
class NiftyClusteringAdmin(admin.ModelAdmin):
    list_display = ['period', 'interval', 'n_clusters', 'pca_explained_variance', 'created_at']
    list_filter = ['created_at', 'period', 'interval', 'n_clusters']
    readonly_fields = ['created_at']


@admin.register(GoldSilverCorrelation)
class GoldSilverCorrelationAdmin(admin.ModelAdmin):
    list_display = ['period', 'interval', 'correlation', 'created_at']
    list_filter = ['created_at', 'period', 'interval']
    readonly_fields = ['created_at']


@admin.register(StockSentimentAnalysis)
class StockSentimentAnalysisAdmin(admin.ModelAdmin):
    list_display = ['stock', 'overall_sentiment', 'sentiment_score', 'positive_count', 'negative_count', 'created_at']
    list_filter = ['created_at', 'stock', 'overall_sentiment']
    search_fields = ['stock__symbol']
    readonly_fields = ['created_at']


@admin.register(PortfolioRecommendations)
class PortfolioRecommendationsAdmin(admin.ModelAdmin):
    list_display = ['portfolio', 'reason', 'created_at']
    list_filter = ['created_at', 'portfolio']
    search_fields = ['portfolio__name', 'reason']
    readonly_fields = ['created_at']
