"""Adapter interface for pulling one state's data into the normalized schema.

Every state gets two adapters: one for its unclaimed-property database, one
for its Secretary of State business-entity roll. Real adapters differ wildly
in access method (bulk file vs. API vs. scrape-with-permission vs. "there is
no bulk path, talk to the agency") — see each state module's docstring for
what was confirmed in research as of Aug 2026, and re-verify before building
a production scraper since agency sites and ToS change.

Phase 1 ships every adapter in MOCK mode: `fetch()` returns realistic sample
records instead of hitting a live site, so the full ingest -> normalize ->
match -> API pipeline is testable end-to-end today. Swapping an adapter to
live data later means implementing `_fetch_live()` and flipping `live=True`
— the normalize/upsert contract does not change.
"""
from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Iterable

from app.db import connect


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation/suffixes-adjacent noise, collapse whitespace.

    Used for both person names and business names. Business-entity suffixes
    (LLC, INC, CO, CORP...) are intentionally NOT stripped here — the fuzzy
    matcher's token-based scoring handles those, and stripping them risks
    collapsing distinct entities ("Acme" vs "Acme Holdings LLC").
    """
    name = name.strip().lower()
    name = re.sub(r"[.,'\"]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()


class UnclaimedPropertyAdapter(ABC):
    """One instance per state. Subclass and set state/source_name; implement fetch()."""

    source_state: str
    source_name: str
    live: bool = False  # flip once _fetch_live() is implemented and verified

    @abstractmethod
    def fetch(self) -> Iterable[dict[str, Any]]:
        """Yield raw records as dicts. Mock adapters yield fixture data;
        live adapters would download/parse the source and yield parsed rows."""
        raise NotImplementedError

    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Map a raw record (whatever shape fetch() yields) to the
        unclaimed_property column set. Override per-state if the raw shape
        needs different field mapping; the default assumes fetch() already
        yields column-shaped dicts (true for the Phase 1 mock fixtures)."""
        owner_name = raw["owner_name"]
        return {
            "source_state": self.source_state,
            "source_name": self.source_name,
            "property_id": raw["property_id"],
            "owner_name": owner_name,
            "owner_name_normalized": normalize_name(owner_name),
            "owner_type": raw.get("owner_type", "individual"),
            "address_line": raw.get("address_line"),
            "city": raw.get("city"),
            "state": raw.get("state"),
            "zip": raw.get("zip"),
            "amount_range": raw.get("amount_range"),
            "property_type": raw.get("property_type"),
            "holder_name": raw.get("holder_name"),
            "last_updated": raw.get("last_updated"),
            "raw_data": json.dumps(raw),
        }

    def run(self) -> int:
        """Fetch, normalize, and upsert. Returns the record count and logs
        an ingestion_runs row. This is what a scheduler would call per state."""
        started_at = _now_iso()
        rows = [self.normalize(r) for r in self.fetch()]
        with connect() as conn:
            for row in rows:
                conn.execute(
                    """
                    INSERT INTO unclaimed_property
                        (source_state, source_name, property_id, owner_name, owner_name_normalized,
                         owner_type, address_line, city, state, zip, amount_range, property_type,
                         holder_name, last_updated, raw_data)
                    VALUES (:source_state, :source_name, :property_id, :owner_name, :owner_name_normalized,
                            :owner_type, :address_line, :city, :state, :zip, :amount_range, :property_type,
                            :holder_name, :last_updated, :raw_data)
                    ON CONFLICT(source_state, property_id) DO UPDATE SET
                        owner_name=excluded.owner_name,
                        owner_name_normalized=excluded.owner_name_normalized,
                        address_line=excluded.address_line,
                        city=excluded.city,
                        state=excluded.state,
                        zip=excluded.zip,
                        amount_range=excluded.amount_range,
                        property_type=excluded.property_type,
                        holder_name=excluded.holder_name,
                        last_updated=excluded.last_updated,
                        raw_data=excluded.raw_data
                    """,
                    row,
                )
            conn.execute(
                """INSERT INTO ingestion_runs
                   (source_state, source_type, adapter_name, record_count, started_at, finished_at, status, notes)
                   VALUES (?, 'unclaimed_property', ?, ?, ?, ?, 'success', ?)""",
                (
                    self.source_state,
                    type(self).__name__,
                    len(rows),
                    started_at,
                    _now_iso(),
                    "mock data" if not self.live else "live pull",
                ),
            )
            conn.commit()
        return len(rows)


class BusinessEntityAdapter(ABC):
    """One instance per state. Subclass and set state/source_name; implement fetch()."""

    source_state: str
    source_name: str
    live: bool = False

    @abstractmethod
    def fetch(self) -> Iterable[dict[str, Any]]:
        raise NotImplementedError

    def normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        entity_name = raw["entity_name"]
        officers = raw.get("filing_officer_names", [])
        return {
            "source_state": self.source_state,
            "entity_id": raw["entity_id"],
            "entity_name": entity_name,
            "entity_name_normalized": normalize_name(entity_name),
            "entity_status": raw["entity_status"],
            "dissolution_date": raw.get("dissolution_date"),
            "registered_agent_name": raw.get("registered_agent_name"),
            "filing_officer_names": json.dumps(officers),
            "address_line": raw.get("address_line"),
            "city": raw.get("city"),
            "state": raw.get("state"),
            "zip": raw.get("zip"),
            "raw_data": json.dumps(raw),
        }

    def run(self) -> int:
        started_at = _now_iso()
        rows = [self.normalize(r) for r in self.fetch()]
        with connect() as conn:
            for row in rows:
                conn.execute(
                    """
                    INSERT INTO business_entities
                        (source_state, entity_id, entity_name, entity_name_normalized, entity_status,
                         dissolution_date, registered_agent_name, filing_officer_names,
                         address_line, city, state, zip, raw_data)
                    VALUES (:source_state, :entity_id, :entity_name, :entity_name_normalized, :entity_status,
                            :dissolution_date, :registered_agent_name, :filing_officer_names,
                            :address_line, :city, :state, :zip, :raw_data)
                    ON CONFLICT(source_state, entity_id) DO UPDATE SET
                        entity_name=excluded.entity_name,
                        entity_name_normalized=excluded.entity_name_normalized,
                        entity_status=excluded.entity_status,
                        dissolution_date=excluded.dissolution_date,
                        registered_agent_name=excluded.registered_agent_name,
                        filing_officer_names=excluded.filing_officer_names,
                        address_line=excluded.address_line,
                        city=excluded.city,
                        state=excluded.state,
                        zip=excluded.zip,
                        raw_data=excluded.raw_data
                    """,
                    row,
                )
            conn.execute(
                """INSERT INTO ingestion_runs
                   (source_state, source_type, adapter_name, record_count, started_at, finished_at, status, notes)
                   VALUES (?, 'business_entities', ?, ?, ?, ?, 'success', ?)""",
                (
                    self.source_state,
                    type(self).__name__,
                    len(rows),
                    started_at,
                    _now_iso(),
                    "mock data" if not self.live else "live pull",
                ),
            )
            conn.commit()
        return len(rows)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
