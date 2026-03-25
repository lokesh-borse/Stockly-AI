from django.db import models
from django.conf import settings


class LinearRegressionResult(models.Model):
    """Stores linear regression predictions for stocks in a portfolio."""
    portfolio = models.ForeignKey(
        'portfolio.Portfolio',
        on_delete=models.CASCADE,
        related_name='ml_linear_regression_results'
    )
    stock = models.ForeignKey(
        'stocks.Stock',
        on_delete=models.CASCADE,
        related_name='ml_linear_regression_results'
    )
    points_used = models.PositiveIntegerField()
    slope = models.FloatField()
    intercept = models.FloatField()
    latest_close = models.DecimalField(max_digits=12, decimal_places=4)
    predicted_next_close = models.DecimalField(max_digits=12, decimal_places=4)
    predicted_change_percent = models.DecimalField(max_digits=10, decimal_places=4)
    data_source = models.CharField(max_length=32, default='yfinance')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['portfolio', '-created_at']),
            models.Index(fields=['stock', '-created_at']),
        ]
        verbose_name = 'Linear Regression Result'
        verbose_name_plural = 'Linear Regression Results'

    def __str__(self):
        return f"{self.portfolio.name} - {self.stock.symbol} - {self.created_at.date()}"


class LogisticRegressionResult(models.Model):
    """Stores logistic regression predictions (UP/DOWN signals) for stocks."""
    SIGNAL_CHOICES = [
        ('STRONG_BUY', 'Strong Buy'),
        ('BUY', 'Buy'),
        ('HOLD', 'Hold'),
        ('SELL', 'Sell'),
        ('STRONG_SELL', 'Strong Sell'),
    ]

    portfolio = models.ForeignKey(
        'portfolio.Portfolio',
        on_delete=models.CASCADE,
        related_name='ml_logistic_regression_results'
    )
    stock = models.ForeignKey(
        'stocks.Stock',
        on_delete=models.CASCADE,
        related_name='ml_logistic_regression_results'
    )
    points_used = models.PositiveIntegerField()
    positive_days = models.PositiveIntegerField()
    test_accuracy = models.FloatField()
    probability_up_next_close = models.FloatField()  # 0.0 to 1.0
    signal = models.CharField(max_length=32, choices=SIGNAL_CHOICES)
    data_source = models.CharField(max_length=32, default='yfinance')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['portfolio', '-created_at']),
            models.Index(fields=['stock', '-created_at']),
        ]
        verbose_name = 'Logistic Regression Result'
        verbose_name_plural = 'Logistic Regression Results'

    def __str__(self):
        return f"{self.portfolio.name} - {self.stock.symbol} - {self.signal} ({self.created_at.date()})"


class PortfolioClusteringResult(models.Model):
    """Stores K-Means clustering results for portfolio risk assessment."""
    portfolio = models.ForeignKey(
        'portfolio.Portfolio',
        on_delete=models.CASCADE,
        related_name='ml_clustering_results'
    )
    n_clusters = models.PositiveSmallIntegerField(default=3)
    clustering_data = models.JSONField(
        help_text="Raw clustering data with cluster assignments and PCA coordinates for each stock"
    )
    summary = models.JSONField(
        help_text="Summary statistics for each cluster (count, avg returns, avg volatility, etc.)"
    )
    pca_explained_variance = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['portfolio', '-created_at'])]
        verbose_name = 'Portfolio Clustering Result'
        verbose_name_plural = 'Portfolio Clustering Results'

    def __str__(self):
        return f"{self.portfolio.name} - {self.n_clusters} clusters ({self.created_at.date()})"


class PortfolioSummaryReport(models.Model):
    """Stores text narratives and insights about portfolio composition and performance."""
    portfolio = models.ForeignKey(
        'portfolio.Portfolio',
        on_delete=models.CASCADE,
        related_name='ml_summary_reports'
    )
    report_text = models.TextField(help_text="Markdown formatted text narrative")
    groups = models.JSONField(
        help_text="Risk category groupings: High-Risk, Medium-Risk, Low-Risk stocks"
    )
    positive_count = models.IntegerField()
    negative_count = models.IntegerField()
    best_stock = models.CharField(max_length=32, blank=True)
    worst_stock = models.CharField(max_length=32, blank=True)
    best_return_percent = models.FloatField(null=True, blank=True)
    worst_return_percent = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['portfolio', '-created_at'])]
        verbose_name = 'Portfolio Summary Report'
        verbose_name_plural = 'Portfolio Summary Reports'

    def __str__(self):
        return f"{self.portfolio.name} - Report ({self.created_at.date()})"


class NiftyClustering(models.Model):
    """Stores market-level clustering of NIFTY 50 stocks."""
    PERIOD_CHOICES = [
        ('1mo', '1 Month'),
        ('3mo', '3 Months'),
        ('6mo', '6 Months'),
        ('1y', '1 Year'),
        ('2y', '2 Years'),
        ('5y', '5 Years'),
    ]
    INTERVAL_CHOICES = [
        ('1d', 'Daily'),
        ('1wk', 'Weekly'),
        ('1mo', 'Monthly'),
    ]

    period = models.CharField(max_length=16, choices=PERIOD_CHOICES, default='1y')
    interval = models.CharField(max_length=16, choices=INTERVAL_CHOICES, default='1d')
    n_clusters = models.PositiveSmallIntegerField(default=3)
    clustering_data = models.JSONField(
        help_text="All NIFTY 50 stocks with cluster assignments"
    )
    summary = models.JSONField(
        help_text="Cluster summaries with statistics"
    )
    pca_explained_variance = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['period', 'interval', '-created_at']),
        ]
        verbose_name = 'NIFTY 50 Clustering'
        verbose_name_plural = 'NIFTY 50 Clustering Results'

    def __str__(self):
        return f"NIFTY {self.n_clusters} clusters - {self.period} ({self.created_at.date()})"


class GoldSilverCorrelation(models.Model):
    """Stores gold/silver correlation analysis and historical data."""
    PERIOD_CHOICES = [
        ('1mo', '1 Month'),
        ('3mo', '3 Months'),
        ('6mo', '6 Months'),
        ('1y', '1 Year'),
        ('2y', '2 Years'),
        ('5y', '5 Years'),
    ]
    INTERVAL_CHOICES = [
        ('1d', 'Daily'),
        ('1wk', 'Weekly'),
        ('1mo', 'Monthly'),
    ]

    period = models.CharField(max_length=16, choices=PERIOD_CHOICES, default='5y')
    interval = models.CharField(max_length=16, choices=INTERVAL_CHOICES, default='1d')
    correlation = models.FloatField(help_text="Correlation coefficient between gold and silver")
    gold_data = models.JSONField(help_text="Historical GOLD price data")
    silver_data = models.JSONField(help_text="Historical SILVER price data")
    statistics = models.JSONField(
        help_text="Mean, std dev, trend analysis for both metals"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['period', 'interval', '-created_at']),
        ]
        verbose_name = 'Gold Silver Correlation'
        verbose_name_plural = 'Gold Silver Correlation Results'

    def __str__(self):
        return f"Gold-Silver Correlation {self.period} - Corr: {self.correlation:.3f} ({self.created_at.date()})"


class StockSentimentAnalysis(models.Model):
    """Stores sentiment analysis results from stock news."""
    SENTIMENT_CHOICES = [
        ('POSITIVE', 'Positive'),
        ('NEGATIVE', 'Negative'),
        ('NEUTRAL', 'Neutral'),
    ]

    stock = models.ForeignKey(
        'stocks.Stock',
        on_delete=models.CASCADE,
        related_name='ml_sentiment_analyses'
    )
    overall_sentiment = models.CharField(max_length=16, choices=SENTIMENT_CHOICES)
    positive_count = models.PositiveIntegerField()
    negative_count = models.PositiveIntegerField()
    neutral_count = models.PositiveIntegerField()
    sentiment_score = models.FloatField(
        help_text="Aggregate sentiment score (positive - negative)"
    )
    news_breakdown = models.JSONField(
        help_text="Detailed sentiment per news item with title, sentiment, strength"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stock', '-created_at']),
            models.Index(fields=['overall_sentiment']),
        ]
        verbose_name = 'Stock Sentiment Analysis'
        verbose_name_plural = 'Stock Sentiment Analyses'

    def __str__(self):
        return f"{self.stock.symbol} - {self.overall_sentiment} ({self.created_at.date()})"


class PortfolioRecommendations(models.Model):
    """Stores stock recommendations for a portfolio."""
    portfolio = models.ForeignKey(
        'portfolio.Portfolio',
        on_delete=models.CASCADE,
        related_name='ml_recommendations'
    )
    reason = models.CharField(
        max_length=255,
        help_text="Why this stock is recommended"
    )
    recommendations = models.JSONField(
        help_text="List of recommended stocks with symbol, name, sector, price, PE ratio, market cap"
    )
    portfolio_sectors = models.JSONField(
        help_text="List of sectors currently in portfolio"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['portfolio', '-created_at'])]
        verbose_name = 'Portfolio Recommendation'
        verbose_name_plural = 'Portfolio Recommendations'

    def __str__(self):
        return f"{self.portfolio.name} - {len(self.recommendations)} recommendations ({self.created_at.date()})"
