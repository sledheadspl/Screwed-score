-- Lost Assets module — normalized schema (Phase 1)
-- Backs both Type A (direct owner match) and Type B (officer/agent -> dissolved
-- entity -> entity's own unclaimed property) matching.

PRAGMA foreign_keys = ON;

-- One row per unclaimed-property record pulled from a state UP database
-- (or a NAUPA aggregator, where a state's ToS permits it).
CREATE TABLE IF NOT EXISTS unclaimed_property (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_state        TEXT NOT NULL,              -- 'WA' | 'ID' | 'OR' | 'MT'
    source_name         TEXT NOT NULL,               -- e.g. 'WA DOR Unclaimed Property'
    property_id         TEXT NOT NULL,               -- state's own record/claim id
    owner_name           TEXT NOT NULL,              -- raw name as reported by the state
    owner_name_normalized TEXT NOT NULL,             -- lowercased, punctuation-stripped, for matching
    owner_type          TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'business'
    address_line        TEXT,
    city                TEXT,
    state               TEXT,                        -- owner's address state (may differ from source_state)
    zip                 TEXT,
    amount_range        TEXT,                        -- most states report a bucket, not an exact figure
    property_type       TEXT,                        -- e.g. 'wages', 'securities', 'safe deposit box'
    holder_name         TEXT,                         -- the business/entity that reported the property
    last_updated         TEXT,                        -- ISO date the source record was last refreshed
    raw_data            TEXT,                         -- JSON blob of the untouched source record
    ingested_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (source_state, property_id)
);

CREATE INDEX IF NOT EXISTS idx_up_owner_name_norm ON unclaimed_property (owner_name_normalized);
CREATE INDEX IF NOT EXISTS idx_up_state ON unclaimed_property (source_state);

-- One row per business entity pulled from a Secretary of State roll,
-- filtered (at ingestion or query time) to dissolved / administratively-dissolved / inactive.
CREATE TABLE IF NOT EXISTS business_entities (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    source_state           TEXT NOT NULL,             -- 'WA' | 'ID' | 'OR' | 'MT'
    entity_id              TEXT NOT NULL,              -- state's SOS entity/UBI number
    entity_name             TEXT NOT NULL,
    entity_name_normalized  TEXT NOT NULL,
    entity_status           TEXT NOT NULL,             -- e.g. 'Administratively Dissolved', 'Inactive - Withdrawn'
    dissolution_date        TEXT,
    registered_agent_name   TEXT,
    filing_officer_names    TEXT,                       -- JSON array of {name, title} — officers/directors/managers/members
    address_line            TEXT,
    city                    TEXT,
    state                   TEXT,
    zip                     TEXT,
    raw_data                TEXT,                        -- JSON blob of the untouched source record
    ingested_at             TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (source_state, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_be_entity_name_norm ON business_entities (entity_name_normalized);
CREATE INDEX IF NOT EXISTS idx_be_state ON business_entities (source_state);
CREATE INDEX IF NOT EXISTS idx_be_status ON business_entities (entity_status);

-- Tracks each ingestion run per source, for freshness display and debugging.
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_state    TEXT NOT NULL,
    source_type     TEXT NOT NULL,     -- 'unclaimed_property' | 'business_entities'
    adapter_name    TEXT NOT NULL,
    record_count    INTEGER NOT NULL,
    started_at      TEXT NOT NULL,
    finished_at     TEXT NOT NULL,
    status          TEXT NOT NULL,     -- 'success' | 'partial' | 'failed'
    notes           TEXT
);
