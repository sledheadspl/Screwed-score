"""Populate the local SQLite DB by running every registered mock adapter.

Usage: python -m app.ingestion.seed
"""
from __future__ import annotations

from app.db import init_db, reset_db
from app.ingestion.states import BUSINESS_ENTITY_ADAPTERS, UNCLAIMED_PROPERTY_ADAPTERS


def seed_all(reset: bool = True) -> dict[str, int]:
    init_db()
    if reset:
        reset_db()
    counts: dict[str, int] = {}
    for adapter in UNCLAIMED_PROPERTY_ADAPTERS:
        n = adapter.run()
        counts[f"{adapter.source_state}_unclaimed_property"] = n
    for adapter in BUSINESS_ENTITY_ADAPTERS:
        n = adapter.run()
        counts[f"{adapter.source_state}_business_entities"] = n
    return counts


if __name__ == "__main__":
    result = seed_all()
    total = sum(result.values())
    print(f"Seeded {total} records:")
    for k, v in sorted(result.items()):
        print(f"  {k}: {v}")
