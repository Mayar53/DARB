"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from src.stories.adapters.outbound.orm_models import ParticipationStoryModel
from src.stories.domain.entities import ParticipationStory
from src.stories.domain.ports import StoryRepository


class DjangoStoryRepository(StoryRepository):
    """All queries join the user + opportunity rows once (select_related),
    so the author name and opportunity title are always available."""

    def _queryset(self):
        return ParticipationStoryModel.objects.select_related("user", "opportunity")

    def list_for_opportunity(self, opportunity_id: int) -> list[ParticipationStory]:
        rows = self._queryset().filter(opportunity_id=opportunity_id)
        return [self._to_entity(row) for row in rows]

    def list_by_user(self, user_id: int) -> list[ParticipationStory]:
        rows = self._queryset().filter(user_id=user_id)
        return [self._to_entity(row) for row in rows]

    def get_by_id(self, story_id: int) -> ParticipationStory | None:
        row = self._queryset().filter(pk=story_id).first()
        return self._to_entity(row) if row else None

    def get_for_user_and_opportunity(
        self, user_id: int, opportunity_id: int
    ) -> ParticipationStory | None:
        row = self._queryset().filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).first()
        return self._to_entity(row) if row else None

    def exists_for_user_and_opportunity(
        self, user_id: int, opportunity_id: int
    ) -> bool:
        return ParticipationStoryModel.objects.filter(
            user_id=user_id, opportunity_id=opportunity_id
        ).exists()

    def add(
        self, *, user_id: int, opportunity_id: int, experience: str
    ) -> ParticipationStory:
        row = ParticipationStoryModel.objects.create(
            user_id=user_id,
            opportunity_id=opportunity_id,
            experience=experience,
        )
        return self._to_entity(
            self._queryset().get(pk=row.pk)
        )

    def update(self, story: ParticipationStory, **fields) -> ParticipationStory:
        row = ParticipationStoryModel.objects.filter(pk=story.id).first()
        if row is None:
            return story
        for key, value in fields.items():
            setattr(row, key, value)
        row.save()
        return self._to_entity(
            self._queryset().get(pk=row.pk)
        )

    def delete(self, story_id: int) -> None:
        ParticipationStoryModel.objects.filter(pk=story_id).delete()

    def toggle_helpful(self, story_id: int, user_id: int) -> ParticipationStory:
        row = ParticipationStoryModel.objects.filter(pk=story_id).first()
        if row is None:
            return None  # type: ignore[return-value]
        helpful = list(row.helpful or [])
        if user_id in helpful:
            helpful.remove(user_id)
        else:
            helpful.append(user_id)
        row.helpful = helpful
        row.save(update_fields=["helpful"])
        return self._to_entity(self._queryset().get(pk=row.pk))

    def add_flag(self, story_id: int, user_id: int) -> ParticipationStory:
        row = ParticipationStoryModel.objects.filter(pk=story_id).first()
        if row is None:
            return None  # type: ignore[return-value]
        flags = list(row.flags or [])
        if user_id not in flags:
            flags.append(user_id)
        row.flags = flags
        row.save(update_fields=["flags"])
        return self._to_entity(self._queryset().get(pk=row.pk))

    def clear_flags(self, story_id: int) -> ParticipationStory:
        row = ParticipationStoryModel.objects.filter(pk=story_id).first()
        if row is None:
            return None  # type: ignore[return-value]
        row.flags = []
        row.save(update_fields=["flags"])
        return self._to_entity(self._queryset().get(pk=row.pk))

    def list_flagged(self) -> list[ParticipationStory]:
        rows = self._queryset().exclude(flags=[])
        return [self._to_entity(row) for row in rows]

    @staticmethod
    def _to_entity(row: ParticipationStoryModel) -> ParticipationStory:
        # Privacy: never expose the full identity. Prefer the nickname, then
        # the first name, then a generic fallback.
        user = row.user
        if user.nickname:
            author_name = user.nickname
        elif user.full_name:
            author_name = user.full_name.split()[0]
        else:
            author_name = user.email.split("@")[0]
        return ParticipationStory(
            id=row.pk,
            user_id=row.user_id,
            opportunity_id=row.opportunity_id,
            experience=row.experience,
            author_name=author_name,
            opportunity_title=row.opportunity.title,
            helpful=list(row.helpful or []),
            flags=list(row.flags or []),
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
