"""
Composition root for the applied feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. The router asks the container for a use case; nothing else constructs
adapters.
"""

from __future__ import annotations

from functools import lru_cache

from src.applied.adapters.outbound.repositories import DjangoAppliedRepository
from src.applied.application.use_cases import AddApplied, ListApplied, RemoveApplied
from src.opportunities.adapters.outbound.repositories import (
    DjangoOpportunityRepository,
)


class AppliedContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.applied = DjangoAppliedRepository()
        self.opportunities = DjangoOpportunityRepository()

    @property
    def list_applied(self) -> ListApplied:
        return ListApplied(self.applied)

    @property
    def add_applied(self) -> AddApplied:
        return AddApplied(self.applied, self.opportunities)

    @property
    def remove_applied(self) -> RemoveApplied:
        return RemoveApplied(self.applied)


@lru_cache(maxsize=1)
def container() -> AppliedContainer:
    return AppliedContainer()
