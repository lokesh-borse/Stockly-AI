from rest_framework import serializers
from .models import Portfolio, PortfolioStock
from apps.stocks.models import Stock

class PortfolioStockSerializer(serializers.ModelSerializer):
    stock_id = serializers.IntegerField(source='stock.id', read_only=True)
    symbol = serializers.CharField(source='stock.symbol', read_only=True)
    name = serializers.CharField(source='stock.name', read_only=True)
    pe_ratio = serializers.DecimalField(source='stock.pe_ratio', max_digits=10, decimal_places=2, required=False, allow_null=True)
    current_price = serializers.SerializerMethodField()
    week_52_high = serializers.DecimalField(source='stock._52_week_high', max_digits=14, decimal_places=2, required=False, allow_null=True)
    week_52_low = serializers.DecimalField(source='stock._52_week_low', max_digits=14, decimal_places=2, required=False, allow_null=True)

    def get_current_price(self, obj):
        latest = obj.stock.prices.order_by('-date').first()
        return float(latest.close_price) if latest else None

    class Meta:
        model = PortfolioStock
        fields = [
            'id',
            'stock_id',
            'symbol',
            'name',
            'pe_ratio',
            'current_price',
            'week_52_high',
            'week_52_low',
            'quantity',
            'purchase_price',
            'purchase_date',
        ]

class PortfolioSerializer(serializers.ModelSerializer):
    stocks = PortfolioStockSerializer(source='holdings', many=True, read_only=True)
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'stocks', 'total_value']

    def get_total_value(self, obj):
        total = 0
        for h in obj.holdings.all():
            qty = h.quantity or 0
            latest_price = None
            if latest_price is None:
                latest_stored = h.stock.prices.order_by('-date').first()
                if latest_stored:
                    latest_price = float(latest_stored.close_price)

            if latest_price is None:
                latest_price = float(h.purchase_price or 0)

            total += float(latest_price) * qty
        return round(total, 2)
