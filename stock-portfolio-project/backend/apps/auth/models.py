from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from django.utils import timezone
import datetime

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    preferred_sector = models.CharField(max_length=128, blank=True)
    investment_goal = models.CharField(max_length=256, blank=True)
    risk_tolerance = models.CharField(max_length=64, blank=True)
    # For OTP password reset
    telegram_chat_id = models.CharField(max_length=64, blank=True, null=True,
        help_text="User's Telegram Chat ID to receive OTP messages.")
    # For general communication
    telegram_handle = models.CharField(max_length=64, blank=True, null=True,
        help_text="User's Telegram @username for further communication.")
    # MPIN (6-digit, stored hashed)
    mpin_hash = models.CharField(max_length=256, blank=True, null=True)
    mpin_set = models.BooleanField(default=False)

    def set_mpin(self, raw_mpin):
        self.mpin_hash = make_password(str(raw_mpin))
        self.mpin_set = True
        self.save()

    def check_mpin(self, raw_mpin):
        if not self.mpin_set or not self.mpin_hash:
            return False
        return check_password(str(raw_mpin), self.mpin_hash)

    def __str__(self):
        return self.user.username


class PasswordResetOTP(models.Model):
    """Stores a one-time password (OTP) for resetting account password via Telegram."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_requests')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        """OTP expires after 10 minutes."""
        return timezone.now() > self.created_at + datetime.timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.user.username} (used={self.is_used})"
