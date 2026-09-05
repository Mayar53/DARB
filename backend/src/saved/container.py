"""
Composition root for the saved feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. The router asks the container for a use case; nothing else constructs
adapters.
"""

from __future__ import annotations

from functools import lru_cache

from src.opportunities.adapters.outbound.repositories import (
    DjangoOpportunityRepository,
)
from src.saved.adapters.outbound.repositories import DjangoSavedRepository
from src.saved.application.use_cases import AddSaved, ListSaved, RemoveSaved


class SavedContainer:
    def __init__(self) -> None:
        # Adapters are stateless, so a single instance each is fine.
        self.saved = DjangoSavedRepository()
        self.opportunities = DjangoOpportunityRepository()

    @property
    def list_saved(self) -> ListSaved:
        return ListSaved(self.saved)

    @property
    def add_saved(self) -> AddSaved:
        return AddSaved(self.saved, self.opportunities)

    @property
    def remove_saved(self) -> RemoveSaved:
        return RemoveSaved(self.saved)


@lru_cache(maxsize=1)
def container() -> SavedContainer:
    return SavedContainer()
