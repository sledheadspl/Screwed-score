/**
 * SQLite schema — mirrors src-tauri/src/db/sqlite.rs INIT_SQL.
 * Used by the frontend to initialize the database on first launch via tauri-plugin-sql.
 *
 * Split into individual statements for sequential execution.
 */

export const INIT_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    license_key TEXT,
    license_status TEXT DEFAULT 'free',
    detection_sensitivity INTEGER DEFAULT 50,
    audio_weight REAL DEFAULT 0.3,
    chat_weight REAL DEFAULT 0.3,
    pre_roll_seconds INTEGER DEFAULT 5,
    post_roll_seconds INTEGER DEFAULT 10,
    clip_length_max INTEGER DEFAULT 30,
    cooldown_seconds INTEGER DEFAULT 60,
    keywords TEXT DEFAULT '[]',
    caption_font TEXT DEFAULT 'Montserrat',
    caption_color TEXT DEFAULT '#FFFFFF',
    caption_outline_color TEXT DEFAULT '#000000',
    caption_animation TEXT DEFAULT 'none',
    watermark_enabled INTEGER DEFAULT 1,
    auto_publish INTEGER DEFAULT 0,
    tiktok_auto_publish INTEGER DEFAULT 0,
    youtube_auto_publish INTEGER DEFAULT 0,
    twitter_auto_publish INTEGER DEFAULT 0,
    clips_used_this_month INTEGER DEFAULT 0,
    usage_reset_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS stream_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    stream_url TEXT,
    stream_id TEXT,
    title TEXT,
    game TEXT,
    started_at TEXT,
    ended_at TEXT,
    clips_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_id INTEGER REFERENCES streams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'processing',
    score REAL DEFAULT 0,
    trigger_reason TEXT,
    start_time REAL,
    end_time REAL,
    duration REAL,
    file_path TEXT,
    thumbnail_path TEXT,
    transcript TEXT,
    title TEXT,
    description TEXT,
    hashtags TEXT DEFAULT '[]',
    views INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clip_id INTEGER REFERENCES clips(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    post_id TEXT,
    post_url TEXT,
    status TEXT DEFAULT 'pending',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    scheduled_at TEXT,
    published_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publish_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clip_id INTEGER REFERENCES clips(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    scheduled_at TEXT,
    status TEXT DEFAULT 'queued',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    clips_generated INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    tiktok_views INTEGER DEFAULT 0,
    youtube_views INTEGER DEFAULT 0,
    twitter_views INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at);
CREATE INDEX IF NOT EXISTS idx_publications_clip_id ON publications(clip_id);
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status)
`;
