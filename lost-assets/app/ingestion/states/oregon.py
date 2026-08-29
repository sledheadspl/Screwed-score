"""Oregon adapters.

UNCLAIMED PROPERTY — Oregon State Treasury, https://unclaimed.oregon.gov
  Access method: web search form. No bulk file, API, or MissingMoney
  reference found. Note: Dept of State Lands also has a legacy-looking
  unclaimedproperty application; which agency is currently authoritative
  was a conflicting signal in research and should be re-confirmed before
  building a live adapter.

DISSOLVED BUSINESS ENTITIES — OR Secretary of State, Corporation Division (sos.oregon.gov)
  Two paths surfaced: (a) a web search UI, plus a separate "Special Search
  Request" form specifically for INACTIVE business search — suggesting
  dissolved-entity lookup isn't fully self-service; (b) an open-data bulk
  dataset on data.oregon.gov, "Active Businesses – ALL" (Socrata/SODA API,
  CSV export). As named, that dataset may exclude dissolved entities, which
  would make it useless for Type B matching — needs verification.
  Officer/registered-agent field presence in either path is unconfirmed.

Both adapters run in mock mode for Phase 1 (see app/ingestion/base.py).
"""
from __future__ import annotations

from typing import Any, Iterable

from app.ingestion.base import BusinessEntityAdapter, UnclaimedPropertyAdapter
from app.ingestion.mock_data import make_entity_filler, make_property_filler

STATE = "OR"

# Hand-authored scenarios:
# 1. Maria Garcia — clean Type A match on a common surname, to exercise the
#    uniqueness-weighting part of confidence scoring (should still land
#    "high" here since it's a full exact-normalized match plus state match,
#    but a fuzzy near-match on this name should score lower than the same
#    fuzziness on a rare surname).
# 2. Jennifer Park — a KNOWN GAP case. The property is recorded under a
#    maiden/previous name; a query for "Jennifer Lee" will NOT find it.
#    Phase 1 has no marriage-record or name-history data source, so
#    maiden-name matching is out of scope; this fixture exists so the gap
#    is documented and tested (see tests/test_matching.py) rather than
#    silently assumed to work.
SCENARIO_PROPERTY: list[dict[str, Any]] = [
    {
        "property_id": "OR-UP-000001",
        "owner_name": "Maria Garcia",
        "owner_type": "individual",
        "address_line": "88 SW Yamhill St",
        "city": "Portland",
        "state": "OR",
        "zip": "97204",
        "amount_range": "$500-$999",
        "property_type": "insurance proceeds",
        "holder_name": "Summit Insurance Co",
        "last_updated": "2026-03-21",
    },
    {
        "property_id": "OR-UP-000002",
        "owner_name": "Jennifer Park",  # recorded under previous/maiden name
        "owner_type": "individual",
        "address_line": "500 NE Broadway",
        "city": "Portland",
        "state": "OR",
        "zip": "97232",
        "amount_range": "$100-$499",
        "property_type": "wages",
        "holder_name": "Evergreen Payroll Services",
        "last_updated": "2026-02-10",
    },
]

SCENARIO_ENTITIES: list[dict[str, Any]] = []


class ORUnclaimedPropertyAdapter(UnclaimedPropertyAdapter):
    source_state = STATE
    source_name = "Oregon State Treasury Unclaimed Property (unclaimed.oregon.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_PROPERTY
        yield from make_property_filler(STATE, n=40, start_id=100, seed=3001)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "Confirm Treasury vs. DSL as authoritative source, then no "
            "bulk/API path was found — a scraper would need ToS review."
        )


class ORBusinessEntityAdapter(BusinessEntityAdapter):
    source_state = STATE
    source_name = "Oregon SOS Corporation Division / data.oregon.gov"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_ENTITIES
        yield from make_entity_filler(STATE, n=30, start_id=100, seed=3002)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "Verify whether the data.oregon.gov 'Active Businesses - ALL' "
            "Socrata dataset actually includes dissolved/inactive entities "
            "before relying on it; otherwise this needs the Special Search "
            "Request path or a UI scraper."
        )
