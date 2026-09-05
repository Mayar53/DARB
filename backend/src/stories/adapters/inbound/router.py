"""Inbound HTTP adapter: the django-ninja router for the stories feature.

The router is thin — it validates input, authorises the caller, delegates to a
use case from the composition root, and lets the domain entities serialize into
the response schemas.
"""

from __future__ import annotations

from ninja import Router, Status

from src.gamification.container import container as gamification_container
from src.shared.infrastructure.auth import AuthPrincipal, JWTAuth
from src.stories.adapters.inbound import schemas as s
from src.stories.application.use_cases import (
    CreateStoryCommand,
    UpdateStoryCommand,
)
from src.stories.container import container

router = Router()
jwt_auth = JWTAuth()


def _optional_principal(request) -> AuthPrincipal | None:
    """Return the caller's principal when a valid Bearer token is present,
    otherwise None. Used by public endpoints that enrich the response for
    signed-in users without requiring authentication."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    return jwt_auth.authenticate(request, token)


@router.get("/flagged", auth=jwt_auth, response=list[s.StoryOut])
def list_flagged(request):
    """Admin-only moderation queue. Registered FIRST so it isn't shadowed by
    /{story_id}."""
    principal: AuthPrincipal = request.auth
    from src.accounts.container import container as accounts_container
    user = accounts_container().get_current_user.execute(principal.id)
    if not user.is_staff:
        from src.shared.domain.exceptions import PermissionDeniedError
        raise PermissionDeniedError("Staff account required")
    return container().list_flagged.execute()


@router.get("/opportunity/{opportunity_id}", response=s.StoryListOut)
def list_stories(request, opportunity_id: int):
    """Public: all stories for an opportunity, plus the caller's own story."""
    stories = container().list_stories_for_opportunity.execute(opportunity_id)

    principal = _optional_principal(request)
    my_story = None
    if principal is not None:
        my_story = next(
            (story for story in stories if story.user_id == principal.id), None
        )

    return s.StoryListOut(stories=stories, my_story=my_story)


@router.get("/mine", auth=jwt_auth, response=list[s.StoryOut])
def list_my_stories(request):
    principal: AuthPrincipal = request.auth
    return container().get_my_stories.execute(principal.id)


@router.post("", auth=jwt_auth, response={201: s.StoryOut})
def create_story(request, payload: s.StoryIn):
    principal: AuthPrincipal = request.auth
    command = CreateStoryCommand(**payload.model_dump())
    story = container().create_story.execute(command, user_id=principal.id)
    # Storyteller badge / points depend on the story count — recompute.
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(201, story)


@router.put("/{story_id}", auth=jwt_auth, response=s.StoryOut)
def update_story(request, story_id: int, payload: s.StoryUpdateIn):
    principal: AuthPrincipal = request.auth
    command = UpdateStoryCommand(story_id=story_id, experience=payload.experience)
    return container().update_story.execute(command, user_id=principal.id)


@router.delete("/{story_id}", auth=jwt_auth, response={204: None})
def delete_story(request, story_id: int):
    principal: AuthPrincipal = request.auth
    container().delete_story.execute(story_id, user_id=principal.id)
    gamification_container().recompute_gamification.execute(principal.id)
    return Status(204, None)


@router.post("/{story_id}/helpful", auth=jwt_auth, response=s.StoryOut)
def toggle_helpful(request, story_id: int):
    principal: AuthPrincipal = request.auth
    return container().toggle_helpful.execute(story_id, user_id=principal.id)


@router.post("/{story_id}/flag", auth=jwt_auth, response=s.StoryOut)
def flag_story(request, story_id: int):
    principal: AuthPrincipal = request.auth
    return container().add_flag.execute(story_id, user_id=principal.id)


@router.get("/flagged", auth=jwt_auth, response=list[s.StoryOut])
def list_flagged(request):
    principal: AuthPrincipal = request.auth
    # Staff-only: only admins should see the moderation queue.
    from src.accounts.container import container as accounts_container
    user = accounts_container().get_current_user.execute(principal.id)
    if not user.is_staff:
        from src.shared.domain.exceptions import PermissionDeniedError
        raise PermissionDeniedError("Staff account required")
    return container().list_flagged.execute()


@router.post("/{story_id}/clear-flags", auth=jwt_auth, response=s.StoryOut)
def clear_flags(request, story_id: int):
    principal: AuthPrincipal = request.auth
    from src.accounts.container import container as accounts_container
    user = accounts_container().get_current_user.execute(principal.id)
    if not user.is_staff:
        from src.shared.domain.exceptions import PermissionDeniedError
        raise PermissionDeniedError("Staff account required")
    return container().clear_flags.execute(story_id)
