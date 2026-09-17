"""Telegram inbound adapter: the webhook endpoint Telegram calls."""

from __future__ import annotations

import json

from django.conf import settings
from ninja import Router

from src.shared.domain.exceptions import PermissionDeniedError
from src.telegram.container import container

router = Router()


@router.post("/webhook/{secret}", response={200: dict})
def telegram_webhook(request, secret: str):
    """Receive a Telegram update.

    Guarded by the shared secret in the URL path (and, when Telegram sends it,
    the ``X-Telegram-Bot-Api-Secret-Token`` header). The raw body is parsed here
    rather than declared as a schema, because a Telegram update is arbitrary JSON.
    """
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    if not expected or secret != expected:
        raise PermissionDeniedError("Invalid webhook secret")
    header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if header and header != expected:
        raise PermissionDeniedError("Invalid webhook secret")

    try:
        update = json.loads(request.body or b"{}")
    except ValueError:
        return {"ok": False}

    container().handle_update.execute(update)
    return {"ok": True}
