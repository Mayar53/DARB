"""Tests for the Telegram bot's /faq command.

The bot has no HTTP surface of its own worth exercising here — these drive
``HandleUpdate`` directly with fakes for its three outbound ports.
"""

import pytest

from src.telegram import faq
from src.telegram.application.use_cases import WELCOME, HandleUpdate
from src.telegram.domain.entities import TelegramSubscriber


class _FakeSender:
    def __init__(self) -> None:
        self.sent: list[tuple[int | str, str]] = []

    def send_message(self, chat_id, text, *, disable_preview=True) -> bool:
        self.sent.append((chat_id, text))
        return True

    @property
    def last(self) -> str:
        assert self.sent, "nothing was sent"
        return self.sent[-1][1]


class _FakeSubscribers:
    def __init__(self) -> None:
        self.rows: dict[int, TelegramSubscriber] = {}

    def upsert(self, *, chat_id, username="", categories=None):
        sub = TelegramSubscriber(
            chat_id=chat_id, username=username, categories=list(categories or [])
        )
        self.rows[chat_id] = sub
        return sub

    def get_by_chat_id(self, chat_id):
        return self.rows.get(chat_id)

    def deactivate(self, chat_id) -> bool:
        return self.rows.pop(chat_id, None) is not None

    def list_active(self):
        return [s for s in self.rows.values() if s.is_active]


class _NoOpportunities:
    def list_all(self):
        return []


@pytest.fixture
def bot():
    sender = _FakeSender()
    handler = HandleUpdate(_FakeSubscribers(), sender, _NoOpportunities())
    return handler, sender


def _update(text: str, chat_id: int = 42) -> dict:
    return {"message": {"chat": {"id": chat_id}, "from": {"username": "tester"}, "text": text}}


def test_faq_content_is_complete():
    """Seven items, each with a non-empty question and answer in both languages."""
    assert len(faq.FAQ_ITEMS) == 7
    for item in faq.FAQ_ITEMS:
        assert len(item) == 4
        assert all(part.strip() for part in item)


def test_bare_faq_returns_the_numbered_index(bot):
    handler, sender = bot
    handler.execute(_update("/faq"))

    reply = sender.last
    assert "FAQ" in reply
    for number, (q_ar, _a_ar, q_en, _a_en) in enumerate(faq.FAQ_ITEMS, start=1):
        assert f"{number}. {q_ar}" in reply
        assert q_en in reply


def test_faq_number_returns_that_answer(bot):
    handler, sender = bot
    handler.execute(_update("/faq 3"))

    reply = sender.last
    q_ar, a_ar, q_en, a_en = faq.FAQ_ITEMS[2]
    assert q_ar in reply and a_ar in reply
    assert q_en in reply and a_en in reply
    # It answered item 3, not the index.
    assert "Send a question number" not in reply


def test_faq_out_of_range_falls_back_to_the_index(bot):
    handler, sender = bot
    handler.execute(_update("/faq 99"))
    assert "Send a question number" in sender.last

    handler.execute(_update("/faq abc"))
    assert "Send a question number" in sender.last


def test_answer_text_rejects_out_of_range_numbers():
    assert faq.answer_text(0) is None
    assert faq.answer_text(len(faq.FAQ_ITEMS) + 1) is None


def test_welcome_lists_the_faq_command(bot):
    handler, sender = bot
    handler.execute(_update("/help"))
    assert "/faq" in sender.last
    assert "/faq" in WELCOME
