from django.contrib.auth.models import User
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    preferred_sector = serializers.CharField(source='profile.preferred_sector', allow_null=True, allow_blank=True, required=False)
    investment_goal = serializers.CharField(source='profile.investment_goal', allow_null=True, allow_blank=True, required=False)
    risk_tolerance = serializers.CharField(source='profile.risk_tolerance', allow_null=True, allow_blank=True, required=False)
    telegram_handle = serializers.CharField(source='profile.telegram_handle', allow_null=True, allow_blank=True, required=False)
    mpin_set = serializers.BooleanField(source='profile.mpin_set', read_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'preferred_sector', 'investment_goal',
                  'risk_tolerance', 'telegram_handle', 'mpin_set']

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=4)
    telegram_chat_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telegram_handle = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()
