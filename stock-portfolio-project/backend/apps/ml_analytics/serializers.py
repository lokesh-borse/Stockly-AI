from rest_framework import serializers
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


class LinearRegressionResultSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)

    class Meta:
        model = LinearRegressionResult
        fields = [
            'id', 'portfolio', 'portfolio_name', 'stock', 'stock_symbol', 'points_used',
            'slope', 'intercept', 'latest_close', 'predicted_next_close',
            'predicted_change_percent', 'data_source', 'created_at'
        ]


class LogisticRegressionResultSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)

    class Meta:
        model = LogisticRegressionResult
        fields = [
            'id', 'portfolio', 'portfolio_name', 'stock', 'stock_symbol', 'points_used',
            'positive_days', 'test_accuracy', 'probability_up_next_close', 'signal',
            'data_source', 'created_at'
        ]


class PortfolioClusteringResultSerializer(serializers.ModelSerializer):
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)

    class Meta:
        model = PortfolioClusteringResult
        fields = [
            'id', 'portfolio', 'portfolio_name', 'n_clusters',
            'clustering_data', 'summary', 'pca_explained_variance', 'created_at'
        ]


class PortfolioSummaryReportSerializer(serializers.ModelSerializer):
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)

    class Meta:
        model = PortfolioSummaryReport
        fields = [
            'id', 'portfolio', 'portfolio_name', 'report_text', 'groups',
            'positive_count', 'negative_count', 'best_stock', 'worst_stock',
            'best_return_percent', 'worst_return_percent', 'created_at'
        ]


class NiftyClusteringSerializer(serializers.ModelSerializer):
    class Meta:
        model = NiftyClustering
        fields = [
            'id', 'period', 'interval', 'n_clusters',
            'clustering_data', 'summary', 'pca_explained_variance', 'created_at'
        ]


class GoldSilverCorrelationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoldSilverCorrelation
        fields = [
            'id', 'period', 'interval', 'correlation',
            'gold_data', 'silver_data', 'statistics', 'created_at'
        ]


class StockSentimentAnalysisSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)

    class Meta:
        model = StockSentimentAnalysis
        fields = [
            'id', 'stock', 'stock_symbol', 'overall_sentiment', 'positive_count',
            'negative_count', 'neutral_count', 'sentiment_score', 'news_breakdown', 'created_at'
        ]


class PortfolioRecommendationsSerializer(serializers.ModelSerializer):
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)

    class Meta:
        model = PortfolioRecommendations
        fields = [
            'id', 'portfolio', 'portfolio_name', 'reason',
            'recommendations', 'portfolio_sectors', 'created_at'
        ]
