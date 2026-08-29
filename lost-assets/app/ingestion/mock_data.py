"""Shared fixture pools + filler-record generator for Phase 1 mock adapters.

Every state adapter mixes two things:
  1. A handful of hand-authored "scenario" records (see each state module) that
     exercise specific matching behaviors on purpose — nicknames, middle
     initials, common surnames, Type B officer->entity->property chains, and
     one deliberately-unmatchable maiden-name case that documents a known
     Phase 1 gap.
  2. A pile of random filler records from this module, so the matcher has to
     work against realistic background noise instead of a suspiciously clean
     dataset.

Filler is generated with Python's stdlib `random` using a fixed seed per
call site, so test runs are deterministic.
"""
from __future__ import annotations

import random
from typing import Any

FIRST_NAMES = [
    "James", "Mary", "Michael", "Patricia", "William", "Jennifer", "David",
    "Linda", "Richard", "Barbara", "Joseph", "Susan", "Thomas", "Jessica",
    "Charles", "Karen", "Daniel", "Nancy", "Matthew", "Lisa", "Anthony",
    "Betty", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Emily",
    "Paul", "Donna", "Andrew", "Michelle", "Joshua", "Dorothy", "Kenneth",
    "Amanda", "Kevin", "Carol", "Brian", "Melissa",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
]
CITIES = {
    "WA": ["Spokane", "Spokane Valley", "Seattle", "Tacoma", "Yakima", "Bellingham"],
    "ID": ["Boise", "Coeur d'Alene", "Idaho Falls", "Pocatello", "Post Falls"],
    "OR": ["Portland", "Eugene", "Salem", "Bend", "Medford"],
    "MT": ["Billings", "Missoula", "Great Falls", "Bozeman", "Kalispell"],
}
AMOUNT_RANGES = ["$25-$99", "$100-$499", "$500-$999", "$1,000-$4,999", "$5,000+"]
PROPERTY_TYPES = ["wages", "utility deposit", "insurance proceeds", "securities", "safe deposit box contents", "checking/savings"]
HOLDERS = ["Pacific Northwest Utility Co", "Cascade Retail Group", "Northwest Regional Bank", "Summit Insurance Co", "Evergreen Payroll Services"]
ENTITY_SUFFIXES = ["LLC", "Inc", "Co", "LLP"]
BUSINESS_WORDS = ["Consulting", "Digital Solutions", "Logistics", "Home Services", "Contracting", "Design Studio", "Auto Repair", "Bookkeeping"]
ENTITY_STATUSES = ["Administratively Dissolved", "Dissolved", "Inactive - Withdrawn"]


def make_property_filler(state: str, n: int, start_id: int, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    out = []
    for i in range(n):
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        out.append({
            "property_id": f"{state}-UP-{start_id + i:06d}",
            "owner_name": f"{first} {last}",
            "owner_type": "individual",
            "address_line": f"{rng.randint(100, 9999)} {rng.choice(['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', '1st Ave'])}",
            "city": rng.choice(CITIES[state]),
            "state": state,
            "zip": f"{rng.randint(83000, 99999)}",
            "amount_range": rng.choice(AMOUNT_RANGES),
            "property_type": rng.choice(PROPERTY_TYPES),
            "holder_name": rng.choice(HOLDERS),
            "last_updated": "2026-06-30",
        })
    return out


def make_entity_filler(state: str, n: int, start_id: int, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    out = []
    for i in range(n):
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        biz = f"{last} {rng.choice(BUSINESS_WORDS)} {rng.choice(ENTITY_SUFFIXES)}"
        out.append({
            "entity_id": f"{state}-BIZ-{start_id + i:06d}",
            "entity_name": biz,
            "entity_status": rng.choice(ENTITY_STATUSES),
            "dissolution_date": "2023-09-15",
            "registered_agent_name": f"{first} {last}",
            "filing_officer_names": [{"name": f"{first} {last}", "title": "Managing Member"}],
            "address_line": f"{rng.randint(100, 9999)} {rng.choice(['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', '1st Ave'])}",
            "city": rng.choice(CITIES[state]),
            "state": state,
            "zip": f"{rng.randint(83000, 99999)}",
        })
    return out
