"""SQLite connection + schema bootstrap for the Lost Assets module.

Phase 1 uses a local SQLite file so the whole pipeline (ingest -> match ->
API) is runnable with zero external setup. The schema is plain SQL with no
SQLite-specific types beyond TEXT/INTEGER, so swapping to Postgres later is a
matter of pointing SQLAlchemy/psycopg at a real instance and re-running
schema.sql (translated) — no data-model changes required.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "lost_assets.db"
SCHEMA_PATH = APP_DIR / "schema.sql"


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Path = DB_PATH) -> None:
    """Create tables/indices if they don't already exist. Idempotent."""
    conn = get_connection(db_path)
    try:
        with open(SCHEMA_PATH, "r") as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()


@contextmanager
def connect(db_path: Path = DB_PATH):
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()


def reset_db(db_path: Path = DB_PATH) -> None:
    """Wipe all rows (keeps schema). Used by the seed script / tests."""
    conn = get_connection(db_path)
    try:
        conn.execute("DELETE FROM unclaimed_property")
        conn.execute("DELETE FROM business_entities")
        conn.execute("DELETE FROM ingestion_runs")
        conn.commit()
    finally:
        conn.close()
