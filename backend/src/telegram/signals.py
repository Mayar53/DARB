"""Telegram signals: broadcast newly published opportunities.

A pre_save stashes the previous status so post_save can detect a transition to
"published" (create or publish). Broadcasting runs on a daemon thread so the
admin's save request is never blocked by Telegram's API.
"""

from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _category_label(model, key: str) -> str:
    return dict(model.Category.choices).get(key, key)


def _notice(instance):
    from src.telegram.application.use_cases import NewOpportunityNotice

    model = type(instance)
    base = (settings.FRONTEND_BASE_URL or "").rstrip("/")
    return NewOpportunityNotice(
        id=instance.pk,
        title=instance.title,
        category=instance.category,
        category_label=_category_label(model, instance.category),
        location=instance.location or "",
        mode=instance.mode,
        deadline=instance.deadline.isoformat() if instance.deadline else "",
        url=f"{base}/opportunities/{instance.pk}" if base else "",
    )


def _broadcast(instance) -> None:
    from django.db import close_old_connections

    from src.telegram.container import container

    close_old_connections()
    try:
        container().broadcast_opportunity.execute(_notice(instance))
    except Exception:  # never let a Telegram failure surface anywhere
        logger.warning("Telegram broadcast failed", exc_info=True)
    finally:
        close_old_connections()


def register() -> None:
    from src.opportunities.adapters.outbound.orm_models import OpportunityModel

    @receiver(pre_save, sender=OpportunityModel, dispatch_uid="telegram_stash_status")
    def _stash_old_status(sender, instance, **kwargs):
        instance._telegram_old_status = (
            OpportunityModel.objects.filter(pk=instance.pk)
            .values_list("status", flat=True)
            .first()
            if instance.pk
            else None
        )

    @receiver(post_save, sender=OpportunityModel, dispatch_uid="telegram_broadcast")
    def _on_saved(sender, instance, created, **kwargs):
        # Dormant unless a bot token is configured (also keeps tests/no-op envs quiet).
        if not settings.TELEGRAM_BOT_TOKEN or instance.status != "published":
            return
        old_status = getattr(instance, "_telegram_old_status", None)
        if not created and old_status == "published":
            return  # already published — don't re-post on unrelated edits
        threading.Thread(target=_broadcast, args=(instance,), daemon=True).start()
