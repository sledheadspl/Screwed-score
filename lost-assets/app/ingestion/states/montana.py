"""Montana adapters.

UNCLAIMED PROPERTY — MT Dept of Revenue, via the TransAction Portal (TAP).
  https://revenue.mt.gov/unclaimed-property
  Access method: state-run web search/claim UI through TAP. No bulk file or
  public API found; not a MissingMoney participant.

DISSOLVED BUSINESS ENTITIES — MT Secretary of State filing portal, https://biz.sosmt.gov
  Best-documented bulk source of the four states: an official "Corporate
  Bulk Download", comma-delimited, zipped for distribution. Column order
  for BE-LLC/AGENT/PRINCIPAL records was confirmed verbatim against:
    https://sosmt.gov/Portals/142/Business/Corp_Bulk_Download_Data_Layout.pdf
    https://sosmt.gov/wp-content/uploads/BulkDownloadSpecs.pdf
  See app/ingestion/states/mt_bulk_parser.py for the real parser built from
  that confirmed layout, and its docstring for exactly which entity record
  types are (BE-LLC) and are not (BE-CORP/BE-LP/BE-LLP/ABN/FBN/B/TM, layout
  unconfirmed) covered.

  ACCESS IS AUTHENTICATED, NOT PUBLIC: the download is issued through the
  MT SOS filing portal login (biz.sosmt.gov/forms/new/1354 is a sign-in
  page, not a public download link) — no pricing was disclosed on the pages
  checked. That means an automated, credential-free live pull isn't
  possible as designed; see MTBusinessEntityAdapter below for how this
  adapter is built to work with that constraint instead of pretending it
  isn't there.

MTUnclaimedPropertyAdapter still runs in mock mode — no bulk/API path was
found for MT's unclaimed property (TAP) system.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

from app.ingestion.base import BusinessEntityAdapter, UnclaimedPropertyAdapter
from app.ingestion.mock_data import make_entity_filler, make_property_filler
from app.ingestion.states.mt_bulk_parser import parse_mt_bulk_file

STATE = "MT"

# Hand-authored Type B scenario: David Chen is the registered agent AND a
# listed principal of Chen Digital Solutions LLC (administratively
# dissolved), and the LLC has unclaimed property on file. Mirrors the real
# MT bulk-download record shape (AGENT + PRINCIPAL blocks).
SCENARIO_PROPERTY: list[dict[str, Any]] = [
    {
        "property_id": "MT-UP-000001",
        "owner_name": "Chen Digital Solutions LLC",
        "owner_type": "business",
        "address_line": "2900 Grand Ave",
        "city": "Billings",
        "state": "MT",
        "zip": "59102",
        "amount_range": "$5,000+",
        "property_type": "securities",
        "holder_name": "Northwest Regional Bank",
        "last_updated": "2026-01-18",
    },
]

SCENARIO_ENTITIES: list[dict[str, Any]] = [
    {
        "entity_id": "MT-BIZ-000001",
        "entity_name": "Chen Digital Solutions LLC",
        "entity_status": "Inactive - Withdrawn",
        "dissolution_date": "2021-06-04",
        "registered_agent_name": "David Chen",
        "filing_officer_names": [{"name": "David Chen", "title": "Manager"}],
        "address_line": "2900 Grand Ave",
        "city": "Billings",
        "state": "MT",
        "zip": "59102",
    },
]


class MTUnclaimedPropertyAdapter(UnclaimedPropertyAdapter):
    source_state = STATE
    source_name = "Montana Unclaimed Property via TAP (revenue.mt.gov)"

    def fetch(self) -> Iterable[dict[str, Any]]:
        yield from SCENARIO_PROPERTY
        yield from make_property_filler(STATE, n=40, start_id=100, seed=4001)

    def _fetch_live(self):  # pragma: no cover — not implemented in Phase 1
        raise NotImplementedError(
            "No confirmed bulk/API path for MT UP via TAP; would need a "
            "ToS-reviewed scraper of the search/claim UI."
        )


class MTBusinessEntityAdapter(BusinessEntityAdapter):
    """Mock by default. Pass a `bulk_file_path` to switch to live mode.

    Because the real bulk download requires an authenticated biz.sosmt.gov
    account (see module docstring), this adapter does NOT perform that
    download itself — creating and paying for a government filing-portal
    account is a business decision for whoever operates GetScrewedScore,
    not something to automate silently. The intended operational workflow:
      1. Someone with portal access downloads + unzips the bulk file
         periodically (cadence TBD — not disclosed in the spec) and drops
         it at a known path.
      2. `MTBusinessEntityAdapter(bulk_file_path=<that path>)` parses it for
         real via mt_bulk_parser.parse_mt_bulk_file() and ingests only
         BE-LLC entities whose status looks dissolved/inactive/withdrawn.
    No credentials are stored or handled in this codebase either way.
    """

    source_state = STATE
    source_name = "Montana SOS Corporate Bulk Download (biz.sosmt.gov)"

    def __init__(self, bulk_file_path: str | Path | None = None):
        self.bulk_file_path = Path(bulk_file_path) if bulk_file_path else None
        self.live = self.bulk_file_path is not None

    def fetch(self) -> Iterable[dict[str, Any]]:
        if self.live:
            yield from self._fetch_live()
        else:
            yield from SCENARIO_ENTITIES
            yield from make_entity_filler(STATE, n=30, start_id=100, seed=4002)

    def _fetch_live(self) -> Iterable[dict[str, Any]]:
        if not self.bulk_file_path.exists():
            raise FileNotFoundError(
                f"Montana bulk file not found at {self.bulk_file_path}. "
                "This adapter parses an already-downloaded file; it does not "
                "fetch one itself (see class docstring for why)."
            )
        dissolved_markers = ("inactive", "withdrawn", "dissolved", "revoked")
        for rec in parse_mt_bulk_file(self.bulk_file_path):
            status = (rec.get("entity_status") or "").lower()
            if any(marker in status for marker in dissolved_markers):
                yield rec
