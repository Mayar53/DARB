"""
Application use cases for the gamification feature.

Each use case orchestrates the domain and the ports. It contains no Django, no
HTTP and no SQL — only business rules. Dependencies are injected via __init__.

Points mirror the older DARB client formula exactly, computed server-side from
real activity: saved×5 + applied×10 + story×15 + distinct_views×1 +
closing_soon_saved×5. Badges unlock from the same activity counts.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from src.applied.domain.ports import AppliedRepository
from src.gamification.domain.entities import Gamification
from src.gamification.domain.ports import GamificationRepository
from src.opportunities.domain.ports import OpportunityRepository
from src.saved.domain.ports import SavedRepository
from src.shared.application.use_case import UseCase
from src.stories.domain.ports import StoryRepository


@dataclass(frozen=True)
class BadgeSpec:
    key: str
    emoji: str
    name: str
    description: str


BADGES: tuple[BadgeSpec, ...] = (
    BadgeSpec("firstSave", "🔖", "First save", "Saved your first opportunity"),
    BadgeSpec("firstApplied", "✅", "First apply", "Marked your first application"),
    BadgeSpec("firstStory", "📖", "Storyteller", "Shared your first experience"),
    BadgeSpec("deadlineMaster", "⏰", "Deadline master", "Applied to 3+ opportunities"),
    BadgeSpec("closingSoonSave", "⚡", "Clutch saver", "Saved something closing this week"),
    BadgeSpec("explorer", "🧭", "Explorer", "Opened 10+ opportunities"),
)

#: The window (days) within which a deadline counts as "closing soon".
CLOSING_SOON_DAYS = 7

#: Points per activity, matching the older DARB formula.
POINTS_SAVE = 5
POINTS_APPLY = 10
POINTS_STORY = 15
POINTS_VIEW = 1
POINTS_CLOSING_SAVE = 5

#: Badge unlock thresholds.
EXPLORER_VIEWS = 10
DEADLINE_MASTER_APPLIES = 3


def _is_closing_soon(deadline: date | None, today: date) -> bool:
    if deadline is None:
        return False
    days = (deadline - today).days
    return 0 <= days <= CLOSING_SOON_DAYS


class RecordView(UseCase[tuple[int, int], None]):
    """Idempotently record that a user opened an opportunity detail."""

    def __init__(
        self,
        gamification: GamificationRepository,
        opportunities: OpportunityRepository,
    ) -> None:
        self._gamification = gamification
        self._opportunities = opportunities

    def execute(self, data: tuple[int, int]) -> None:
        user_id, opportunity_id = data
        if self._opportunities.get_by_id(opportunity_id) is None:
            return
        self._gamification.record_view(user_id, opportunity_id)


class RecomputeGamification(UseCase[int, Gamification]):
    """Recompute a user's points + badges from their real activity."""

    def __init__(
        self,
        gamification: GamificationRepository,
        saved: SavedRepository,
        applied: AppliedRepository,
        stories: StoryRepository,
        opportunities: OpportunityRepository,
    ) -> None:
        self._gamification = gamification
        self._saved = saved
        self._applied = applied
        self._stories = stories
        self._opportunities = opportunities

    def execute(self, user_id: int) -> Gamification:
        today = date.today()

        saved_items = self._saved.list_for_user(user_id)
        applied_items = self._applied.list_for_user(user_id)
        stories = self._stories.list_by_user(user_id)
        views = self._gamification.count_distinct_views(user_id)

        saved_count = len(saved_items)
        applied_count = len(applied_items)
        story_count = len(stories)

        closing_soon_saved = 0
        for s in saved_items:
            opp = self._opportunities.get_by_id(s.opportunity_id)
            if opp is not None and _is_closing_soon(opp.deadline, today):
                closing_soon_saved += 1

        points = (
            saved_count * POINTS_SAVE
            + applied_count * POINTS_APPLY
            + story_count * POINTS_STORY
            + views * POINTS_VIEW
            + closing_soon_saved * POINTS_CLOSING_SAVE
        )

        badges: list[dict] = []
        if saved_count >= 1:
            badges.append(self._badge_dict(BADGES[0]))
        if applied_count >= 1:
            badges.append(self._badge_dict(BADGES[1]))
        if story_count >= 1:
            badges.append(self._badge_dict(BADGES[2]))
        if applied_count >= DEADLINE_MASTER_APPLIES:
            badges.append(self._badge_dict(BADGES[3]))
        if closing_soon_saved >= 1:
            badges.append(self._badge_dict(BADGES[4]))
        if views >= EXPLORER_VIEWS:
            badges.append(self._badge_dict(BADGES[5]))

        gamification = Gamification(
            user_id=user_id,
            points=points,
            badges=badges,
            stats={
                "saved": saved_count,
                "applied": applied_count,
                "stories": story_count,
                "views": views,
                "closing_soon_saved": closing_soon_saved,
            },
        )
        return self._gamification.save(gamification)

    @staticmethod
    def _badge_dict(spec: BadgeSpec) -> dict:
        return {
            "key": spec.key,
            "emoji": spec.emoji,
            "name": spec.name,
            "description": spec.description,
        }
