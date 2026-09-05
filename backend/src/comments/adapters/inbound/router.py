"""Inbound HTTP adapter: the django-ninja router for the comments feature.

The router is thin — it validates input, authorises the caller, delegates to a
use case from the composition root, and lets the domain entities serialize into
the response schemas.
"""

from __future__ import annotations

from ninja import Router, Status

from src.accounts.container import container as accounts_container
from src.comments.adapters.inbound import schemas as s
from src.comments.application.use_cases import CreateCommentCommand
from src.comments.container import container
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth

router = Router()
jwt_auth = JWTAuth()


def _load_user(principal: AuthPrincipal):
    """Load the caller's full user (for staff checks)."""
    return accounts_container().get_current_user.execute(principal.id)


@router.get("/opportunity/{opportunity_id}", response=list[s.CommentOut])
def list_opportunity_comments(request, opportunity_id: int):
    """Public: all comments on an opportunity."""
    return container().list_opportunity_comments.execute(opportunity_id)


@router.get("/story/{story_id}", response=list[s.CommentOut])
def list_story_comments(request, story_id: int):
    """Public: all comments on a story."""
    return container().list_story_comments.execute(story_id)


@router.post("", auth=jwt_auth, response={201: s.CommentOut})
def create_comment(request, payload: s.CommentIn):
    principal: AuthPrincipal = request.auth
    comment = container().create_comment.execute(
        CreateCommentCommand(**payload.model_dump()),
        user_id=principal.id,
    )
    return Status(201, comment)


@router.delete("/{comment_id}", auth=jwt_auth, response={204: None})
def delete_comment(request, comment_id: int):
    principal: AuthPrincipal = request.auth
    user = _load_user(principal)
    container().delete_comment.execute(
        comment_id,
        user_id=principal.id,
        is_staff=user.is_staff,
    )
    return Status(204, None)
