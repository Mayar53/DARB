"""
Composition root for the opportunities feature.

This is the only place that wires concrete adapters to the ports the use cases
depend on. The router asks the container for a use case; nothing else constructs
adapters.
"""

from __future__ import annotations

from functools import lru_cache

from src.opportunities.adapters.outbound.repositories import DjangoOpportunityRepository
from src.opportunities.application.use_cases import (
    CreateOpportunity,
    CsvImport,
    DeleteOpportunity,
    GetActiveOpportunity,
    GetAnalytics,
    GetOpportunity,
    GetOpportunityDashboard,
    IncrementApplyClicks,
    IncrementViews,
    ListMyOpportunities,
    ListOpportunities,
    ListSubjectFields,
    UpdateOpportunity,
)


class OpportunitiesContainer:
    def __init__(self) -> None:
        # The repository is stateless, so a single instance is fine.
        self.repository = DjangoOpportunityRepository()

    @property
    def list_opportunities(self) -> ListOpportunities:
        return ListOpportunities(self.repository)

    @property
    def list_subject_fields(self) -> ListSubjectFields:
        return ListSubjectFields(self.repository)

    @property
    def get_opportunity(self) -> GetOpportunity:
        return GetOpportunity(self.repository)

    @property
    def get_active_opportunity(self) -> GetActiveOpportunity:
        return GetActiveOpportunity(self.repository)

    @property
    def create_opportunity(self) -> CreateOpportunity:
        return CreateOpportunity(self.repository)

    @property
    def list_my_opportunities(self) -> ListMyOpportunities:
        return ListMyOpportunities(self.repository)

    @property
    def get_opportunity_dashboard(self) -> GetOpportunityDashboard:
        return GetOpportunityDashboard(self.repository)

    @property
    def update_opportunity(self) -> UpdateOpportunity:
        return UpdateOpportunity(self.repository)

    @property
    def delete_opportunity(self) -> DeleteOpportunity:
        return DeleteOpportunity(self.repository)

    @property
    def increment_apply_clicks(self) -> IncrementApplyClicks:
        return IncrementApplyClicks(self.repository)

    @property
    def increment_views(self) -> IncrementViews:
        return IncrementViews(self.repository)

    @property
    def csv_import(self) -> CsvImport:
        return CsvImport(self.repository)

    @property
    def get_analytics(self) -> GetAnalytics:
        return GetAnalytics(self.repository)


@lru_cache(maxsize=1)
def container() -> OpportunitiesContainer:
    return OpportunitiesContainer()
