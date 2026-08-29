"""Name similarity scoring.

Two distinct scorers on purpose:
  - `person_name_score` understands first/middle/last structure, a common
    English-nickname dictionary, and tolerates a missing middle name/initial
    on either side without penalty. Used for matching a user's own name
    against a record's owner_name (Type A) or against a registered
    agent/officer name (Type B).
  - `business_name_score` is a plain fuzzy ratio over the normalized string.
    Used for the entity-name -> unclaimed-property-owner-name join inside
    Type B. Business names don't have first/last structure, so the person
    scorer doesn't apply; this also means legal-suffix variants (LLC vs
    L.L.C. vs "Limited Liability Company") are only handled as far as
    normalize_name's punctuation stripping gets you — flagged as a Phase 2
    improvement in the README, not solved here.

Known Phase 1 gap, by design: neither scorer knows about maiden/previous
names. A record filed under a name the person no longer uses will not
match. There's no marriage-record or name-history data source in scope for
Phase 1 — see the OR mock fixture (Jennifer Park) and its test for the
documented, expected non-match.
"""
from __future__ import annotations

from rapidfuzz import fuzz

from app.ingestion.base import normalize_name

# Each inner list is a mutually-interchangeable group of first-name forms.
# Not exhaustive — extend as real query traffic surfaces misses.
_NICKNAME_GROUPS = [
    ["robert", "bob", "rob", "bobby", "robbie"],
    ["william", "bill", "will", "billy", "liam"],
    ["james", "jim", "jimmy", "jamie"],
    ["john", "jack", "johnny", "jon"],
    ["richard", "rick", "dick", "ricky", "rich"],
    ["michael", "mike", "mikey", "mick"],
    ["elizabeth", "liz", "beth", "betty", "eliza", "lizzy", "libby"],
    ["margaret", "maggie", "meg", "peggy", "marge"],
    ["katherine", "catherine", "kate", "katie", "kathy", "kat"],
    ["jennifer", "jen", "jenny"],
    ["christopher", "chris", "topher"],
    ["joseph", "joe", "joey"],
    ["thomas", "tom", "tommy"],
    ["charles", "charlie", "chuck", "chas"],
    ["daniel", "dan", "danny"],
    ["matthew", "matt"],
    ["anthony", "tony"],
    ["david", "dave", "davey"],
    ["andrew", "andy", "drew"],
    ["steven", "stephen", "steve"],
    ["kenneth", "ken", "kenny"],
    ["donald", "don", "donnie"],
    ["patricia", "pat", "patty", "trish"],
    ["susan", "sue", "susie"],
    ["barbara", "barb"],
    ["deborah", "debra", "deb", "debbie"],
    ["nicholas", "nick", "nicky"],
    ["samuel", "sam", "sammy"],
    ["benjamin", "ben", "benny"],
    ["alexander", "alex"],
    ["victoria", "vicky", "tori"],
    ["rebecca", "becky", "becca"],
    ["jonathan", "jon", "johnny"],
    ["edward", "ed", "eddie", "ted"],
]

_NICKNAME_CANONICAL: dict[str, str] = {}
for group in _NICKNAME_GROUPS:
    canonical = group[0]
    for variant in group:
        _NICKNAME_CANONICAL[variant] = canonical


def _canonical_first(first: str) -> str:
    return _NICKNAME_CANONICAL.get(first, first)


def parse_person_name(normalized_name: str) -> dict[str, str]:
    """Split an already-normalized ('lowercased, punctuation-stripped') name
    into first/middle/last. Assumes 'first [middle] last' order, which is
    the convention used by every state source in scope for Phase 1."""
    tokens = normalized_name.split()
    if not tokens:
        return {"first": "", "middle": "", "last": ""}
    if len(tokens) == 1:
        return {"first": tokens[0], "middle": "", "last": tokens[0]}
    if len(tokens) == 2:
        return {"first": tokens[0], "middle": "", "last": tokens[1]}
    # 3+ tokens: treat first as first, last as last, everything between as middle
    return {"first": tokens[0], "middle": " ".join(tokens[1:-1]), "last": tokens[-1]}


def person_name_score(query_name: str, candidate_name: str) -> float:
    """Returns 0-100. query_name/candidate_name may be raw (un-normalized);
    normalization happens here."""
    q = parse_person_name(normalize_name(query_name))
    c = parse_person_name(normalize_name(candidate_name))

    if _canonical_first(q["first"]) == _canonical_first(c["first"]) and q["first"] and c["first"]:
        first_score = 100.0
    else:
        first_score = fuzz.ratio(q["first"], c["first"])

    last_score = fuzz.ratio(q["last"], c["last"])

    # Middle name/initial: only a signal when BOTH sides have one. A missing
    # middle on either side is common (state records are inconsistent about
    # including it) and must not be penalized.
    if q["middle"] and c["middle"]:
        # A bare initial ("j") should match a full middle name ("james") --
        # compare on the shared prefix length.
        shorter, longer = sorted([q["middle"], c["middle"]], key=len)
        if longer.startswith(shorter):
            middle_score = 100.0
        else:
            middle_score = fuzz.ratio(q["middle"], c["middle"])
    else:
        middle_score = None

    if middle_score is None:
        combined = 0.45 * first_score + 0.55 * last_score
    else:
        combined = 0.40 * first_score + 0.50 * last_score + 0.10 * middle_score
    return round(combined, 2)


def business_name_score(query_name: str, candidate_name: str) -> float:
    """Returns 0-100 fuzzy ratio between normalized business names."""
    q = normalize_name(query_name)
    c = normalize_name(candidate_name)
    return round(fuzz.token_sort_ratio(q, c), 2)
