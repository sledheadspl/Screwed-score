"""Real parser for Montana SOS's Corporate Bulk Download file.

Confirmed by re-fetching the published spec (Aug 2026):
  https://sosmt.gov/Portals/142/Business/Corp_Bulk_Download_Data_Layout.pdf
  https://sosmt.gov/wp-content/uploads/BulkDownloadSpecs.pdf

Format: comma-delimited (RFC4126-style — a value containing a comma,
newline, or double quote is double-quote-enclosed), zipped for distribution.
It's a flat file mixing several record types, discriminated by the first
column: 'BE-CORP', 'BE-LLC', 'BE-LP', 'BE-LLP', 'ABN', 'FBN', 'B', 'TM' for
the entity record itself, plus 'AGENT' and 'PRINCIPAL' child records that
reference their parent entity by Business Entity Number.

IMPORTANT SCOPE LIMIT: only 'BE-LLC' rows have a confirmed, verbatim column
order (below). BE-CORP/BE-LP/BE-LLP almost certainly use a *different*
column layout (e.g. corporations have shares/directors concepts LLCs don't),
which was not confirmed in this research pass. This parser deliberately
SKIPS those record types rather than guess column positions and silently
mis-map data — better to under-cover than to quietly attribute a stranger's
name to the wrong field. Extending coverage means re-fetching the spec for
each entity type's exact layout and adding it below the same way.

The 7-column "Business Mailing Address" blocks are broken out here as
(line1, line2, city, state, zip, zip4, country) — that specific 7-way split
was NOT given verbatim in the spec (it just says "7 columns"), so it's an
assumption based on standard US SOS address layouts. None of it affects
matching correctness today: the matching engine only reads entity_name,
entity_status, registered_agent_name, and filing_officer_names, which all
come from unambiguous single columns. Verify the address split against a
real sample file before building anything that depends on it.

HOW TO ACTUALLY GET THE FILE: the download is served from an authenticated
Montana SOS filing-portal account (biz.sosmt.gov/forms/new/1354 is a login
page, not a public download link) with no pricing disclosed on the pages
checked. This module does not perform that download — it only parses a
file that's already been obtained and unzipped locally. See
MTBusinessEntityAdapter's docstring for the operational workflow this implies.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any, Iterator

BE_LLC_COLUMNS = [
    "record_type", "entity_number", "entity_name", "entity_type", "entity_subtype",
    "organization_date", "qualification", "term_of_existence", "expiration_date",
    "entity_status_description", "entity_status_change_reason", "inactive_date",
    "reviver_reinstate_date", "llc_management_type", "tribal_designation",
    "principal_addr_line1", "principal_addr_line2", "principal_addr_city",
    "principal_addr_state", "principal_addr_zip", "principal_addr_zip4",
    "principal_addr_country",
    "purpose", "jurisdiction", "notice_date", "involuntary_dissolution_intent_date",
    "ar_last_filed_date", "suspension_date",
]

AGENT_COLUMNS = [
    "record_type", "entity_number", "agent_name",
    "agent_phys_line1", "agent_phys_line2", "agent_phys_city", "agent_phys_state",
    "agent_phys_zip", "agent_phys_zip4", "agent_phys_country",
    "agent_post_line1", "agent_post_line2", "agent_post_city", "agent_post_state",
    "agent_post_zip", "agent_post_zip4", "agent_post_country",
]

PRINCIPAL_COLUMNS = [
    "record_type", "entity_number", "name", "position",
    "addr_line1", "addr_line2", "addr_city", "addr_state", "addr_zip", "addr_zip4",
    "addr_country",
    "related_entity_id",
]

# Record types present in the real file that we intentionally do not parse
# (unconfirmed column layout) — kept here so a skipped row is a deliberate,
# named decision rather than an unexplained silent drop.
UNSUPPORTED_ENTITY_RECORD_TYPES = {"BE-CORP", "BE-LP", "BE-LLP", "ABN", "FBN", "B", "TM"}


def _rows(path: Path) -> Iterator[list[str]]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        yield from csv.reader(f)


def parse_mt_bulk_file(path: str | Path) -> list[dict[str, Any]]:
    """Parse an already-downloaded, already-unzipped MT bulk file into
    normalized business-entity dicts (the shape BusinessEntityAdapter.normalize()
    expects as input), covering BE-LLC entities only. Joins AGENT and
    PRINCIPAL child rows onto their parent by Business Entity Number.
    """
    path = Path(path)
    entities: dict[str, dict[str, str]] = {}
    agents: dict[str, dict[str, str]] = {}
    principals: dict[str, list[dict[str, str]]] = {}
    skipped_unsupported = 0

    for row in _rows(path):
        if not row:
            continue
        record_type = row[0].strip()

        if record_type == "BE-LLC":
            if len(row) < len(BE_LLC_COLUMNS):
                continue
            rec = dict(zip(BE_LLC_COLUMNS, row))
            entities[rec["entity_number"]] = rec
        elif record_type == "AGENT":
            if len(row) < len(AGENT_COLUMNS):
                continue
            rec = dict(zip(AGENT_COLUMNS, row))
            agents[rec["entity_number"]] = rec
        elif record_type == "PRINCIPAL":
            if len(row) < len(PRINCIPAL_COLUMNS):
                continue
            rec = dict(zip(PRINCIPAL_COLUMNS, row))
            principals.setdefault(rec["entity_number"], []).append(rec)
        elif record_type in UNSUPPORTED_ENTITY_RECORD_TYPES:
            skipped_unsupported += 1
        # else: unrecognized record type -- ignore silently, matches CSV
        # extract behavior of "new columns/types may appear over time"

    out: list[dict[str, Any]] = []
    for entity_number, rec in entities.items():
        agent = agents.get(entity_number)
        officers = [
            {"name": p["name"], "title": p.get("position", "")}
            for p in principals.get(entity_number, [])
            if p.get("name")
        ]
        out.append({
            "entity_id": entity_number,
            "entity_name": rec["entity_name"],
            "entity_status": rec["entity_status_description"],
            "dissolution_date": rec.get("inactive_date") or None,
            "registered_agent_name": agent["agent_name"] if agent else None,
            "filing_officer_names": officers,
            "address_line": rec.get("principal_addr_line1") or None,
            "city": rec.get("principal_addr_city") or None,
            "state": rec.get("principal_addr_state") or "MT",
            "zip": rec.get("principal_addr_zip") or None,
        })

    if skipped_unsupported:
        # Visible in adapter logs / ingestion_runs.notes rather than swallowed.
        out_meta_note = (
            f"{skipped_unsupported} rows skipped (unsupported entity record "
            f"types: {sorted(UNSUPPORTED_ENTITY_RECORD_TYPES)})"
        )
        for rec in out:
            rec.setdefault("_ingestion_note", out_meta_note)

    return out
