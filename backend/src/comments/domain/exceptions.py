"""Comments domain exceptions (pure Python)."""

from __future__ import annotations

from src.shared.domain.exceptions import NotFoundError


class CommentNotFound(NotFoundError):
    code = "comment_not_found"
