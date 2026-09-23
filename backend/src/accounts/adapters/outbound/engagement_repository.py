"""Persistence adapter: read-only engagement counts for the owner leaderboard.

Views and clicks are columns on the opportunity row itself, so the leaderboard
reads them through the opportunities repository. Applications are stored in the
applied feature's table — this adapter counts them here so the accounts use case
never imports another feature's model directly.
"""

from __future__ import annotations

from src.accounts.domain.ports import AdminEngagementRepository
from src.applied.adapters.outbound.orm_models import AppliedOpportunityModel


class DjangoAdminEngagementRepository(AdminEngagementRepository):
    def count_applications_for_owner(self, owner_id: int) -> int:
        """How many applications the opportunities created by ``owner_id`` received."""
        return AppliedOpportunityModel.objects.filter(
            opportunity__created_by_id=owner_id
        ).count()
