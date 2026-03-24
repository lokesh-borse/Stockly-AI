import random
import requests
from django.conf import settings


def send_otp_via_telegram(chat_id: str, otp: str) -> tuple[bool, str]:
    """
    Sends a password reset OTP to the user's Telegram account via the bot.
    Returns:
      (True, "") when delivery succeeds
      (False, "<reason>") when delivery fails
    """
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token:
        return False, 'telegram_token_missing'

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    message = (
        f"*Stock Portfolio - Password Reset*\n\n"
        f"Your OTP code is: *{otp}*\n\n"
        f"This code expires in *10 minutes*.\n"
        f"If you did not request this, please ignore this message."
    )

    try:
        response = requests.post(
            url,
            json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown",
            },
            timeout=10,
        )
        if response.status_code == 200:
            return True, ''

        reason = 'telegram_send_failed'
        try:
            payload = response.json() or {}
            desc = str(payload.get('description') or '').strip().lower()
            if 'chat not found' in desc:
                reason = 'chat_not_found'
            elif 'bot was blocked' in desc:
                reason = 'bot_blocked_by_user'
            elif 'user is deactivated' in desc:
                reason = 'user_deactivated'
            elif desc:
                reason = f'telegram_api_error:{desc}'
        except ValueError:
            pass

        return False, reason
    except requests.RequestException:
        return False, 'telegram_network_error'


def generate_otp() -> str:
    """Generates a random 6-digit OTP string."""
    return str(random.randint(100000, 999999))
