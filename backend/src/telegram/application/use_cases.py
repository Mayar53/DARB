"""Telegram application use cases (framework-free)."""

from __future__ import annotations

import html
from dataclasses import dataclass

from src.opportunities.domain.ports import OpportunityRepository
from src.shared.application.use_case import UseCase
from src.telegram import faq
from src.telegram.domain.ports import MessageSender, SubscriberRepository

MODE_LABELS = {"online": "أونلاين / Online", "in-person": "حضوري / In-person", "hybrid": "هجين / Hybrid"}


def _esc(value: str) -> str:
    """Escape dynamic text for Telegram's HTML parse mode."""
    return html.escape(value or "", quote=False)


@dataclass(frozen=True)
class NewOpportunityNotice:
    """Everything the broadcast needs, already resolved by the caller."""

    id: int
    title: str
    category: str
    category_label: str
    location: str
    mode: str
    deadline: str  # ISO date or ""
    url: str


class BroadcastOpportunity(UseCase[NewOpportunityNotice, int]):
    """Post a published opportunity to the channel and matching subscribers."""

    def __init__(
        self,
        subscribers: SubscriberRepository,
        sender: MessageSender,
        channel_id: str = "",
    ) -> None:
        self._subscribers = subscribers
        self._sender = sender
        self._channel_id = channel_id

    def execute(self, notice: NewOpportunityNotice) -> int:
        text = self._format(notice)
        sent = 0
        if self._channel_id:
            if self._sender.send_message(self._channel_id, text):
                sent += 1
        for sub in self._subscribers.list_active():
            if sub.wants(notice.category):
                if self._sender.send_message(sub.chat_id, text):
                    sent += 1
        return sent

    @staticmethod
    def _format(n: NewOpportunityNotice) -> str:
        lines = ["🔔 <b>فرصة جديدة / New opportunity</b>", "", f"<b>{_esc(n.title)}</b>"]
        if n.category_label:
            lines.append(f"🏷 {_esc(n.category_label)}")
        meta = " · ".join(
            _esc(x) for x in (n.location, MODE_LABELS.get(n.mode, n.mode)) if x
        )
        if meta:
            lines.append(f"📍 {meta}")
        if n.deadline:
            lines.append(f"📅 {_esc(n.deadline)}")
        if n.url:
            lines.append("")
            lines.append(f'🔗 <a href="{_esc(n.url)}">التفاصيل والتقديم / View & apply</a>')
        return "\n".join(lines)


WELCOME = (
    "أهلاً بك في بوت درب 🇮🇶\n"
    "Welcome to the DARB bot!\n\n"
    "الأوامر / Commands:\n"
    "/subscribe — اشترك في كل الفرص\n"
    "/subscribe coding, workshop — اشترك حسب التصنيف\n"
    "/unsubscribe — إلغاء الاشتراك\n"
    "/latest — أحدث الفرص\n"
    "/categories — التصنيفات المتاحة\n"
    "/faq — الأسئلة الشائعة / FAQ\n"
    "/help — المساعدة"
)


class HandleUpdate(UseCase[dict, None]):
    """Handle one Telegram update (a /command message) and reply."""

    def __init__(
        self,
        subscribers: SubscriberRepository,
        sender: MessageSender,
        opportunities: OpportunityRepository,
        frontend_base: str = "",
    ) -> None:
        self._subscribers = subscribers
        self._sender = sender
        self._opportunities = opportunities
        self._frontend_base = frontend_base.rstrip("/")

    def execute(self, update: dict) -> None:
        message = update.get("message") or update.get("edited_message") or {}
        chat = message.get("chat") or {}
        chat_id = chat.get("id")
        text = (message.get("text") or "").strip()
        if not chat_id or not text:
            return
        username = ((message.get("from") or {}).get("username") or "").strip()

        parts = text.split()
        command = parts[0].split("@")[0].lower()
        args = parts[1:]

        if command == "/start":
            self._subscribers.upsert(chat_id=chat_id, username=username, categories=[])
            self._reply(chat_id, WELCOME)
        elif command == "/subscribe":
            categories = [a.lower() for a in args]
            sub = self._subscribers.upsert(chat_id=chat_id, username=username, categories=categories)
            scope = ", ".join(sub.categories) if sub.categories else "كل التصنيفات / all categories"
            self._reply(chat_id, f"✅ تم الاشتراك: {scope}\nSubscribed.")
        elif command == "/unsubscribe":
            self._subscribers.deactivate(chat_id)
            self._reply(chat_id, "تم إلغاء الاشتراك. / Unsubscribed.")
        elif command == "/latest":
            self._reply(chat_id, self._latest_text())
        elif command == "/categories":
            self._reply(chat_id, self._categories_text())
        elif command == "/faq":
            # /faq -> the numbered index; /faq 3 -> that answer. An out-of-range
            # or non-numeric argument falls back to the index rather than erroring.
            number = args[0] if args else ""
            answer = faq.answer_text(int(number)) if number.isdigit() else None
            self._reply(chat_id, answer or faq.index_text())
        else:
            self._reply(chat_id, WELCOME)

    def _latest_text(self) -> str:
        opps = self._opportunities.list_all()[:5]
        if not opps:
            return "لا توجد فرص حالياً. / No opportunities yet."
        lines = ["<b>أحدث الفرص / Latest opportunities</b>", ""]
        for o in opps:
            title = _esc(o.title)
            if self._frontend_base:
                lines.append(f'• <a href="{_esc(self._frontend_base)}/opportunities/{o.id}">{title}</a>')
            else:
                lines.append(f"• {title}")
        return "\n".join(lines)

    def _categories_text(self) -> str:
        opps = self._opportunities.list_all()
        seen = sorted({o.category for o in opps})
        if not seen:
            return "لا توجد تصنيفات بعد. / No categories yet."
        body = "\n".join(f"• /subscribe {c}" for c in seen)
        return f"<b>التصنيفات / Categories</b>\n{body}"

    def _reply(self, chat_id: int, text: str) -> None:
        self._sender.send_message(chat_id, text)
