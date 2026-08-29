"""Tests for the real Montana bulk-download parser, against a synthetic
fixture built to the exact confirmed column layout (see
app/ingestion/states/mt_bulk_parser.py's docstring for the source).

This does NOT test against a real downloaded file -- the actual bulk
download requires an authenticated biz.sosmt.gov account (see
MTBusinessEntityAdapter's docstring), which this codebase deliberately does
not automate. What this proves instead: given a file shaped exactly like
the documented real format, the parser and the live-mode adapter wiring
produce correct, matchable records end-to-end.
"""
from __future__ import annotations

import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.db import init_db, reset_db, connect
from app.ingestion.states.mt_bulk_parser import parse_mt_bulk_file
from app.ingestion.states.montana import MTBusinessEntityAdapter, MTUnclaimedPropertyAdapter
from app.matching.engine import match_type_b

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "mt_bulk_sample.csv"


def test_parser_extracts_be_llc_entities():
    records = parse_mt_bulk_file(FIXTURE)
    entity_ids = {r["entity_id"] for r in records}
    assert entity_ids == {"MT0123456", "MT0999999"}  # BE-CORP row correctly excluded


def test_parser_joins_agent_and_all_principals():
    records = {r["entity_id"]: r for r in parse_mt_bulk_file(FIXTURE)}
    chen = records["MT0123456"]
    assert chen["entity_name"] == "Chen Digital Solutions LLC"
    assert chen["entity_status"] == "Inactive Withdrawn"
    assert chen["registered_agent_name"] == "David Chen"
    officer_names = {o["name"] for o in chen["filing_officer_names"]}
    assert officer_names == {"David Chen", "Lisa Chen"}
    titles = {o["name"]: o["title"] for o in chen["filing_officer_names"]}
    assert titles["David Chen"] == "Manager"
    assert titles["Lisa Chen"] == "Member"


def test_parser_does_not_crash_on_unsupported_record_type():
    # The BE-CORP row in the fixture must not appear as a parsed entity, and
    # must not corrupt the row-by-row parse of subsequent/adjacent rows.
    records = parse_mt_bulk_file(FIXTURE)
    assert all(r["entity_id"] != "MT0555555" for r in records)
    assert len(records) == 2


def test_live_adapter_filters_to_dissolved_only():
    adapter = MTBusinessEntityAdapter(bulk_file_path=FIXTURE)
    fetched = list(adapter.fetch())
    ids = {r["entity_id"] for r in fetched}
    assert "MT0123456" in ids       # Inactive Withdrawn -- kept
    assert "MT0999999" not in ids   # Active Good Standing -- filtered out


def test_live_adapter_missing_file_raises_clear_error(tmp_path):
    missing = tmp_path / "does_not_exist.csv"
    adapter = MTBusinessEntityAdapter(bulk_file_path=missing)
    with pytest.raises(FileNotFoundError):
        list(adapter.fetch())


def test_mock_mode_is_unaffected_by_default():
    adapter = MTBusinessEntityAdapter()  # no bulk_file_path -> mock, as before
    assert adapter.live is False
    fetched = list(adapter.fetch())
    assert any(r["entity_id"] == "MT-BIZ-000001" for r in fetched)  # scenario record


def test_end_to_end_live_parsed_data_still_matches_type_b():
    """Replaces the mock MT business-entity adapter with the live-mode
    parser reading the fixture, re-seeds, and confirms Type B matching
    still finds David Chen through the parsed (not hand-authored) record --
    proving the live seam produces data the matching engine can actually use."""
    init_db()
    reset_db()
    MTUnclaimedPropertyAdapter().run()  # still mock; unaffected by this change
    MTBusinessEntityAdapter(bulk_file_path=FIXTURE).run()

    with connect() as conn:
        results = match_type_b("David Chen", "MT", conn)

    assert any(
        r.entity["entity_id"] == "MT0123456" and r.property["property_id"] == "MT-UP-000001"
        for r in results
    )
    top = [r for r in results if r.entity["entity_id"] == "MT0123456"][0]
    assert top.confidence_tier == "high"
    assert "Lisa Chen" not in top.match_basis  # matched via David Chen, not his co-principal
