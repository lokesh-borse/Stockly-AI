from rest_framework import serializers
from .models import Stock, StockPrice, StockUniverse, StockCatalog

class StockSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    _renamed_52_week_high = serializers.SerializerMethodField()
    _renamed_52_week_low = serializers.SerializerMethodField()
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'sector', 'industry', 'market_cap', 'pe_ratio', 'dividend_yield', 'created_at', 'updated_at', 'price', '_renamed_52_week_high', '_renamed_52_week_low']
    def get_price(self, obj):
        p = obj.prices.order_by('-date').first()
        return float(p.close_price) if p else None
    def get__renamed_52_week_high(self, obj):
        return float(obj._52_week_high) if obj._52_week_high is not None else None
    def get__renamed_52_week_low(self, obj):
        return float(obj._52_week_low) if obj._52_week_low is not None else None
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['52_week_high'] = data.pop('_renamed_52_week_high')
        data['52_week_low'] = data.pop('_renamed_52_week_low')
        return data

class StockPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockPrice
        fields = ['id', 'date', 'open_price', 'close_price', 'high_price', 'low_price', 'volume']


class StockUniverseSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockUniverse
        fields = ['id', 'symbol', 'market', 'display_order', 'is_active']


class StockCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockCatalog
        fields = ['id', 'stock_name', 'market', 'symbol', 'sector']
