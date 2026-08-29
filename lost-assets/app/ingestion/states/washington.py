"""Washington adapters.

UNCLAIMED PROPERTY — WA Dept of Revenue Unclaimed Property (UCP) program.
  Search UI: https://ucp.dor.wa.gov  (program info: https://dor.wa.gov/about/unclaimed-property-ucp)
  Access method: state-run web search tool. No bulk file or public API was
  found as of Aug 2026 research — WA runs its own database, it is not a
  MissingMoney/NAUPA participant. No rate-limit/ToS language was found on
  the pages checked; that's absence of evidence, not permission — read the
  site's actual terms before building a live scraper.

DISSOLVED BUSINESS ENTITIES — WA Secretary of State, Corporations & Charities Division.
  Best lead: the official "Corporations Data Extract" bulk file (.txt/.xml/.json)
  at sos.wa.gov, which includes a separate BusinessInfo file, plus a possible
  mirrored dataset on data.wa.gov (Socrata/SODA API — unconfirmed). Per WA's
  own "Governors, Officers, Directors, Members & Managers" FAQ, principal
  names are part of the public record, and the extract includes registered
  agent name/address — this is a promising source for officer-name matching.
  Update cadence for the extract was not confirmed.

Both adapters run in mock mode for Phase 1 (see app/ingestion/base.py).
"""
from __future__ import annotations

from typing import Any, Iterable

from app.ingestion.base import BusinessEntityAdapter, UnclaimedPropertyAdapter
from app.ingestion.mock_data import make_entity_filler, make_property_filler

STATE = "WA"

# Hand-authored scenario: a clean Type A direct match, used by tests to
# exercise nickname / middle-initial / case-insensitive matching.
SCENARIO_PROPERTY: list[dict[str, Any]] = [
    {
        "property_id": "WA-UP-000001",
        "owner_name": "Robert Johnson",
        "owner_type": "individual",
        "address_line": "742 Evergreen Ter",
        "city": "Spokane Valley",
        "state": "WA",
        "zip": "99206",
        "amount_range": "$100-$499",
        "property_type": "wages",
        "holder_name": "Cascade Retail Group",
        "last_updated": "2026-05-14",
    },
]

SCENARIO_ENTITIES: list[dict[str, Any]] = []


class WAUnclaimedPropertyAdapter(UnclaimedPropertyAdapter):
    source_state = STATE
    source_name = "WA DOR Unclaimed Property (ucp.dor.wa.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_PROPERTY
        yield from make_property_filler(STATE, n=40, start_id=100, seed=1001)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "No confirmed bulk/API path for WA UCP as of Aug 2026 research; "
            "would require a search-UI scraper after ToS review."
        )


class WABusinessEntityAdapter(BusinessEntityAdapter):
    source_state = STATE
    source_name = "WA SOS Corporations Data Extract (sos.wa.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_ENTITIES
        yield from make_entity_filler(STATE, n=30, start_id=100, seed=1002)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "Real adapter should download the Corporations Data Extract "
            "(.txt/.xml/.json) and parse the BusinessInfo file; verify "
            "current extract URL and layout before implementing."
        )
