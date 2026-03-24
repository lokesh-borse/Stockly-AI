from django.db import models

class Stock(models.Model):
    symbol = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=128)
    sector = models.CharField(max_length=128, blank=True)
    industry = models.CharField(max_length=128, blank=True)
    market_cap = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    pe_ratio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dividend_yield = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    _52_week_high = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    _52_week_low = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.symbol

class StockPrice(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='prices')
    date = models.DateField()
    open_price = models.DecimalField(max_digits=12, decimal_places=2)
    close_price = models.DecimalField(max_digits=12, decimal_places=2)
    high_price = models.DecimalField(max_digits=12, decimal_places=2)
    low_price = models.DecimalField(max_digits=12, decimal_places=2)
    volume = models.BigIntegerField()

    class Meta:
        unique_together = ('stock', 'date')


class StockUniverse(models.Model):
    MARKET_IN = 'IN'
    MARKET_US = 'US'
    MARKET_CHOICES = (
        (MARKET_IN, 'Indian'),
        (MARKET_US, 'US'),
    )

    symbol = models.CharField(max_length=32)
    market = models.CharField(max_length=2, choices=MARKET_CHOICES)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('symbol', 'market')
        indexes = [
            models.Index(fields=['market', 'is_active', 'display_order']),
        ]
        ordering = ['market', 'display_order', 'symbol']

    def __str__(self):
        return f"{self.symbol} ({self.market})"


class StockCatalog(models.Model):
    stock_name = models.CharField(max_length=255)
    market = models.CharField(max_length=64)
    symbol = models.CharField(max_length=32)
    sector = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('symbol', 'market')
        indexes = [
            models.Index(fields=['market', 'sector']),
            models.Index(fields=['symbol']),
        ]
        ordering = ['market', 'sector', 'stock_name']

    def __str__(self):
        return f"{self.stock_name} ({self.symbol}) - {self.market}"
