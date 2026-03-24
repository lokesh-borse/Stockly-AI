from django.conf import settings
from django.db import models

class Portfolio(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portfolios')
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PortfolioStock(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='holdings')
    stock = models.ForeignKey('stocks.Stock', on_delete=models.CASCADE, related_name='portfolios')
    quantity = models.IntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('portfolio', 'stock')


class TimeSeriesForecast(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='time_series_forecasts')
    stock = models.ForeignKey('stocks.Stock', on_delete=models.CASCADE, related_name='time_series_forecasts')
    model_name = models.CharField(max_length=32, default='ARIMA')
    horizon_days = models.PositiveSmallIntegerField()
    points_used = models.PositiveIntegerField(default=0)
    latest_close = models.DecimalField(max_digits=12, decimal_places=4)
    predicted_close = models.DecimalField(max_digits=12, decimal_places=4)
    predicted_change_percent = models.DecimalField(max_digits=10, decimal_places=4)
    historical_points = models.JSONField(default=list, blank=True)
    prediction_points = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class GrowthAnalysis(models.Model):
    """Stores 3-month statistical growth data for a portfolio (persisted to DB)."""
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='growth_analyses')
    period_label = models.CharField(max_length=32, default='3M')
    mean_return = models.FloatField()       # average daily return
    std_dev = models.FloatField()           # standard deviation of returns
    sharpe_ratio = models.FloatField()      # annualised Sharpe
    total_return = models.FloatField()      # total period return (%)
    best_stock = models.CharField(max_length=32, blank=True)
    worst_stock = models.CharField(max_length=32, blank=True)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-computed_at']


class PortfolioRating(models.Model):
    """ML-based star rating (1-5) for a portfolio."""
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='ratings')
    score = models.FloatField()           # raw logistic probability 0-1
    stars = models.PositiveSmallIntegerField()  # 1 to 5
    label = models.CharField(max_length=32, blank=True)  # e.g. "Excellent"
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-computed_at']
