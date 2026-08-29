"""Type A / Type B matching + confidence scoring.

Confidence model (documented, not hidden): every candidate gets a 0-1
confidence score built from three signals —
  1. name similarity (the dominant signal — see fuzzy.py)
  2. name uniqueness (a match on "Smith" means less than a match on
     "Featherstonhaugh"; we discount confidence for common surnames rather
     than pretend all name matches are equally strong)
  3. state agreement (a bonus when the user-supplied state matches the
     record's state, a small penalty on disagreement — not exclusion,
     since people move and property can be reported where a business was
     registered rather than where the owner currently lives)

MIN_MATCH_THRESHOLD exists to keep obvious noise (a 20% name-similarity
coincidence) out of the response entirely — that's a data-quality floor,
not the "silently hide low-confidence matches" behavior the spec calls out.
Everything at or above the floor is returned WITH its tier, including "low."
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from app.matching.fuzzy import business_name_score, parse_person_name, person_name_score
from app.ingestion.base import normalize_name

MIN_MATCH_THRESHOLD = 0.45          # final confidence floor to appear in results at all
NAME_SCORE_PREFILTER = 55.0         # raw fuzzy score floor before we even compute confidence
BUSINESS_JOIN_THRESHOLD = 78.0      # entity_name <-> unclaimed_property.owner_name join floor
DISSOLVED_STATUS_MARKERS = ("dissolved", "inactive", "withdrawn", "revoked", "administratively")

# Top-15 US surnames (2020 Census) get the larger uniqueness discount; the
# rest of the shared filler-name pool gets a smaller one. Anything outside
# both lists is treated as distinctive and gets no discount.
_VERY_COMMON_SURNAMES = {
    "smith", "johnson", "williams", "brown", "jones", "garcia", "miller",
    "davis", "rodriguez", "martinez", "hernandez", "lopez", "gonzalez",
    "wilson", "anderson",
}
_COMMON_SURNAMES = {
    "thomas", "taylor", "moore", "jackson", "martin", "lee", "perez",
    "thompson", "white", "harris", "sanchez", "clark", "ramirez", "lewis",
    "robinson", "walker", "young", "allen", "king", "wright", "scott",
    "torres", "nguyen", "hill", "flores",
}


@dataclass
class MatchResult:
    match_type: str  # 'A' | 'B'
    confidence_score: float
    confidence_tier: str  # 'high' | 'medium' | 'low'
    name_score: float
    property: dict[str, Any]
    entity: dict[str, Any] | None = None
    match_basis: str = ""

    def to_dict(self) -> dict[str, Any]:
        out = {
            "match_type": self.match_type,
            "confidence_score": self.confidence_score,
            "confidence_tier": self.confidence_tier,
            "name_score": self.name_score,
            "match_basis": self.match_basis,
            "property": self.property,
        }
        if self.entity is not None:
            out["entity"] = self.entity
        return out


def _uniqueness_discount(last_name_normalized: str) -> float:
    if last_name_normalized in _VERY_COMMON_SURNAMES:
        return 0.08
    if last_name_normalized in _COMMON_SURNAMES:
        return 0.03
    return 0.0


def _state_adjustment(query_state: str | None, record_state: str | None) -> float:
    if not query_state or not record_state:
        return 0.0
    if query_state.strip().upper() == record_state.strip().upper():
        return 0.07
    return -0.05


def _tier(confidence: float) -> str:
    if confidence >= 0.85:
        return "high"
    if confidence >= 0.65:
        return "medium"
    return "low"


def compute_confidence(name_score: float, query_name: str, query_state: str | None, record_state: str | None) -> tuple[float, str]:
    parsed = parse_person_name(normalize_name(query_name))
    raw = name_score / 100.0
    raw -= _uniqueness_discount(parsed["last"])
    raw += _state_adjustment(query_state, record_state)
    raw = max(0.0, min(1.0, raw))
    return round(raw, 3), _tier(raw)


def match_type_a(query_name: str, query_state: str | None, conn) -> list[MatchResult]:
    """Direct match: query name vs. individual owner_name records."""
    rows = conn.execute(
        "SELECT * FROM unclaimed_property WHERE owner_type = 'individual'"
    ).fetchall()

    results: list[MatchResult] = []
    for row in rows:
        score = person_name_score(query_name, row["owner_name"])
        if score < NAME_SCORE_PREFILTER:
            continue
        confidence, tier = compute_confidence(score, query_name, query_state, row["state"])
        if confidence < MIN_MATCH_THRESHOLD:
            continue
        results.append(MatchResult(
            match_type="A",
            confidence_score=confidence,
            confidence_tier=tier,
            name_score=score,
            property=_row_to_property_dict(row),
            match_basis=f"name match on unclaimed property owner ({row['source_state']})",
        ))
    results.sort(key=lambda r: r.confidence_score, reverse=True)
    return results


def match_type_b(query_name: str, query_state: str | None, conn) -> list[MatchResult]:
    """Officer/registered-agent match -> dissolved entity -> entity's own
    unclaimed property, if any."""
    entity_rows = conn.execute("SELECT * FROM business_entities").fetchall()

    results: list[MatchResult] = []
    for entity in entity_rows:
        status = (entity["entity_status"] or "").lower()
        if not any(marker in status for marker in DISSOLVED_STATUS_MARKERS):
            continue

        officer_score, officer_name = _best_officer_match(query_name, entity)
        if officer_score < NAME_SCORE_PREFILTER:
            continue

        property_rows = conn.execute(
            "SELECT * FROM unclaimed_property WHERE owner_type = 'business'"
        ).fetchall()
        for prop in property_rows:
            join_score = business_name_score(entity["entity_name"], prop["owner_name"])
            if join_score < BUSINESS_JOIN_THRESHOLD:
                continue

            confidence, tier = compute_confidence(officer_score, query_name, query_state, entity["state"])
            # Discount by how strong the entity<->property join itself is,
            # so a shaky business-name join can't produce a "high" result
            # purely on a great officer-name match.
            confidence = round(confidence * (0.5 + 0.5 * (join_score / 100.0)), 3)
            tier = _tier(confidence)
            if confidence < MIN_MATCH_THRESHOLD:
                continue

            results.append(MatchResult(
                match_type="B",
                confidence_score=confidence,
                confidence_tier=tier,
                name_score=officer_score,
                property=_row_to_property_dict(prop),
                entity=_row_to_entity_dict(entity),
                match_basis=(
                    f"'{query_name}' matches {officer_name} "
                    f"({entity['entity_status']} entity '{entity['entity_name']}'), "
                    f"which has unclaimed property on file in {prop['source_state']}"
                ),
            ))
    results.sort(key=lambda r: r.confidence_score, reverse=True)
    return results


def _best_officer_match(query_name: str, entity_row) -> tuple[float, str]:
    """Highest person_name_score across the entity's registered agent and
    every listed officer/manager/member. Returns (score, matched_name)."""
    best_score = 0.0
    best_name = ""
    candidates = []
    if entity_row["registered_agent_name"]:
        candidates.append(entity_row["registered_agent_name"])
    try:
        officers = json.loads(entity_row["filing_officer_names"] or "[]")
    except (json.JSONDecodeError, TypeError):
        officers = []
    for officer in officers:
        name = officer.get("name") if isinstance(officer, dict) else officer
        if name:
            candidates.append(name)

    for name in candidates:
        score = person_name_score(query_name, name)
        if score > best_score:
            best_score = score
            best_name = name
    return best_score, best_name


def _row_to_property_dict(row) -> dict[str, Any]:
    return {
        "source_state": row["source_state"],
        "source_name": row["source_name"],
        "property_id": row["property_id"],
        "owner_name": row["owner_name"],
        "amount_range": row["amount_range"],
        "property_type": row["property_type"],
        "holder_name": row["holder_name"],
        "last_updated": row["last_updated"],
    }


def _row_to_entity_dict(row) -> dict[str, Any]:
    return {
        "source_state": row["source_state"],
        "entity_id": row["entity_id"],
        "entity_name": row["entity_name"],
        "entity_status": row["entity_status"],
        "dissolution_date": row["dissolution_date"],
        "registered_agent_name": row["registered_agent_name"],
        "filing_officer_names": json.loads(row["filing_officer_names"] or "[]"),
    }
