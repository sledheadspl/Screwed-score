"""Idaho adapters.

UNCLAIMED PROPERTY — Idaho State Treasurer's Office.
  sto.idaho.gov/unclaimedproperty redirects to https://yourmoney.idaho.gov
  Access method: web search form. No bulk file or public API found. The
  yourmoney.idaho.gov URL pattern is shared by several state UP platforms
  run by third-party vendors — worth confirming who actually operates this
  before assuming it behaves like WA's in-house system.

DISSOLVED BUSINESS ENTITIES — Idaho Secretary of State, https://sosbiz.idaho.gov
  Access method: web search UI only. No official bulk download or API was
  found — and the existence of multiple third-party scraping tools/blog
  posts built specifically against sosbiz.idaho.gov is itself a signal that
  there's no sanctioned bulk channel. Whether officer/registered-agent names
  appear in the public search results needs a live page check; treat as
  unconfirmed.

Both adapters run in mock mode for Phase 1 (see app/ingestion/base.py).
"""
from __future__ import annotations

from typing import Any, Iterable

from app.ingestion.base import BusinessEntityAdapter, UnclaimedPropertyAdapter
from app.ingestion.mock_data import make_entity_filler, make_property_filler

STATE = "ID"

# Hand-authored Type B scenario: Sarah Thompson is the registered agent of
# Thompson Consulting LLC (administratively dissolved), and the LLC itself
# has unclaimed property on file. Exercises the officer -> entity -> property join.
SCENARIO_PROPERTY: list[dict[str, Any]] = [
    {
        "property_id": "ID-UP-000001",
        "owner_name": "Thompson Consulting LLC",
        "owner_type": "business",
        "address_line": "1180 W State St",
        "city": "Boise",
        "state": "ID",
        "zip": "83702",
        "amount_range": "$1,000-$4,999",
        "property_type": "checking/savings",
        "holder_name": "Northwest Regional Bank",
        "last_updated": "2026-04-02",
    },
]

SCENARIO_ENTITIES: list[dict[str, Any]] = [
    {
        "entity_id": "ID-BIZ-000001",
        "entity_name": "Thompson Consulting LLC",
        "entity_status": "Administratively Dissolved",
        "dissolution_date": "2022-11-30",
        "registered_agent_name": "Sarah Thompson",
        "filing_officer_names": [{"name": "Sarah Thompson", "title": "Managing Member"}],
        "address_line": "1180 W State St",
        "city": "Boise",
        "state": "ID",
        "zip": "83702",
    },
]


class IDUnclaimedPropertyAdapter(UnclaimedPropertyAdapter):
    source_state = STATE
    source_name = "Idaho Unclaimed Property (yourmoney.idaho.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_PROPERTY
        yield from make_property_filler(STATE, n=40, start_id=100, seed=2001)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "No confirmed bulk/API path; operator of yourmoney.idaho.gov "
            "should be confirmed before building a scraper."
        )


class IDBusinessEntityAdapter(BusinessEntityAdapter):
    source_state = STATE
    source_name = "Idaho SOS Business Search (sosbiz.idaho.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_ENTITIES
        yield from make_entity_filler(STATE, n=30, start_id=100, seed=2002)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "No official bulk/API for Idaho SOS business search; a live "
            "adapter would need a ToS-reviewed scraper, and officer-name "
            "field availability in search results is still unconfirmed."
        )
