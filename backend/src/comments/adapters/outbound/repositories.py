"""Persistence adapter: maps the Django ORM model to/from the domain entity."""

from __future__ import annotations

from src.comments.adapters.outbound.orm_models import CommentModel
from src.comments.domain.entities import Comment
from src.comments.domain.ports import CommentRepository


class DjangoCommentRepository(CommentRepository):
    def _queryset(self):
        return CommentModel.objects.select_related("user", "opportunity", "story", "parent")

    def list_for_opportunity(self, opportunity_id: int) -> list[Comment]:
        rows = self._queryset().filter(opportunity_id=opportunity_id)
        return [self._to_entity(row) for row in rows]

    def list_for_story(self, story_id: int) -> list[Comment]:
        rows = self._queryset().filter(story_id=story_id)
        return [self._to_entity(row) for row in rows]

    def get_by_id(self, comment_id: int) -> Comment | None:
        row = self._queryset().filter(pk=comment_id).first()
        return self._to_entity(row) if row else None

    def add(
        self,
        *,
        user_id: int,
        text: str,
        opportunity_id: int | None = None,
        story_id: int | None = None,
        parent_id: int | None = None,
    ) -> Comment:
        row = CommentModel.objects.create(
            user_id=user_id,
            text=text,
            opportunity_id=opportunity_id,
            story_id=story_id,
            parent_id=parent_id,
        )
        return self._to_entity(self._queryset().get(pk=row.pk))

    def delete(self, comment_id: int) -> None:
        CommentModel.objects.filter(pk=comment_id).delete()

    @staticmethod
    def _to_entity(row: CommentModel) -> Comment:
        # Privacy: never expose the full identity. Prefer the nickname, then
        # the first name, then a generic fallback (same as stories).
        user = row.user
        if user.nickname:
            author_name = user.nickname
        elif user.full_name:
            author_name = user.full_name.split()[0]
        else:
            author_name = user.email.split("@")[0]
        return Comment(
            id=row.pk,
            user_id=row.user_id,
            text=row.text,
            opportunity_id=row.opportunity_id,
            story_id=row.story_id,
            parent_id=row.parent_id,
            author_name=author_name,
            author_avatar=user.avatar or "",
            author_role=user.role or "",
            author_is_staff=user.is_staff,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
