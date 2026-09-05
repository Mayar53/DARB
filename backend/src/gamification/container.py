"""
Composition root for the gamification feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. It reads saved/applied/stories/opportunity data through their own
repositories (cross-feature reads are fine).
"""

from __future__ import annotations

from functools import lru_cache

from src.applied.adapters.outbound.repositories import DjangoAppliedRepository
from src.gamification.adapters.outbound.repositories import DjangoGamificationRepository
from src.gamification.application.use_cases import RecomputeGamification, RecordView
from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.saved.adapters.outbound.repositories import DjangoSavedRepository
from src.stories.adapters.outbound.repositories import DjangoStoryRepository


class GamificationContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.gamification = DjangoGamificationRepository()
        self.saved = DjangoSavedRepository()
        self.applied = DjangoAppliedRepository()
        self.stories = DjangoStoryRepository()
        self.opportunities = DjangoOpportunityRepository()

    @property
    def recompute_gamification(self) -> RecomputeGamification:
        return RecomputeGamification(
            self.gamification,
            self.saved,
            self.applied,
            self.stories,
            self.opportunities,
        )

    @property
    def record_view(self) -> RecordView:
        return RecordView(self.gamification, self.opportunities)


@lru_cache(maxsize=1)
def container() -> GamificationContainer:
    return GamificationContainer()
