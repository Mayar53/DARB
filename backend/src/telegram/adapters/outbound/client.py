"""Telegram Bot API client (outbound adapter).

Uses only the standard library so no extra dependency is needed. Network calls
are best-effort: failures are logged and reported as ``False`` so a Telegram
outage can never break saving an opportunity.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)


class TelegramClient:
    def __init__(self, token: str, *, timeout: int = 10) -> None:
        self._token = token
        self._timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self._token)

    def _call(self, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | None:
        if not self._token:
            return None
        url = f"https://api.telegram.org/bot{self._token}/{method}"
        data = json.dumps(payload or {}).encode()
        req = urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                return json.loads(resp.read())
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("Telegram API %s failed: %s", method, exc)
            return None

    def send_message(
        self, chat_id: int | str, text: str, *, disable_preview: bool = True
    ) -> bool:
        """Send a text message. Returns True when Telegram accepted it."""
        result = self._call(
            "sendMessage",
            {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": disable_preview,
            },
        )
        return bool(result and result.get("ok"))

    def set_webhook(self, url: str, secret_token: str = "") -> bool:
        payload: dict[str, Any] = {"url": url, "allowed_updates": ["message"]}
        if secret_token:
            payload["secret_token"] = secret_token
        result = self._call("setWebhook", payload)
        return bool(result and result.get("ok"))

    def delete_webhook(self) -> bool:
        result = self._call("deleteWebhook")
        return bool(result and result.get("ok"))

    def get_me(self) -> dict[str, Any] | None:
        result = self._call("getMe")
        return result.get("result") if result and result.get("ok") else None

    def get_webhook_info(self) -> dict[str, Any] | None:
        result = self._call("getWebhookInfo")
        return result.get("result") if result and result.get("ok") else None
