/**
 * Tauri API wrappers.
 * Centralizes all invoke() and plugin calls so we can swap to
 * native mobile equivalents later without touching business logic.
 */

import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

// ---- Database singleton ----
let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:clippilot.db");
  }
  return _db;
}

// Lazy proxy that always resolves before each call
export const db = {
  select: async <T>(query: string, bindValues?: unknown[]): Promise<T> => {
    const d = await getDb();
    return d.select<T>(query, bindValues);
  },
  execute: async (query: string, bindValues?: unknown[]) => {
    const d = await getDb();
    return d.execute(query, bindValues);
  },
};

// ---- App Info ----
export interface AppInfo {
  version: string;
  name: string;
  data_dir: string;
  clips_dir: string;
  temp_dir: string;
}

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("get_app_info");
}

export async function getDataDir(): Promise<string> {
  return invoke<string>("get_data_dir");
}

export async function openDataDir(): Promise<void> {
  return invoke<void>("open_data_dir");
}

// ---- Stream commands ----
export interface MonitorStatus {
  is_running: boolean;
  platform: string | null;
  url: string | null;
  stream_id: number | null;
  started_at: string | null;
  clips_generated: number;
  segments_buffered: number;
  current_score: number;
}

export async function getMonitorStatus(): Promise<MonitorStatus> {
  return invoke<MonitorStatus>("get_monitor_status");
}

export async function testStreamUrl(url: string): Promise<boolean> {
  return invoke<boolean>("test_stream_url", { url });
}

// ---- Clip commands ----
export async function getClipsDir(): Promise<string> {
  return invoke<string>("get_clips_dir");
}

export async function deleteClipFile(filePath: string): Promise<void> {
  return invoke<void>("delete_clip_file", { filePath });
}

export interface ThumbnailResult {
  path: string;
  success: boolean;
}

export async function generateThumbnail(clipPath: string): Promise<ThumbnailResult> {
  return invoke<ThumbnailResult>("generate_thumbnail", { clipPath });
}

export interface ClipDuration {
  duration: number;
  width: number;
  height: number;
}

export async function getClipDuration(clipPath: string): Promise<ClipDuration> {
  return invoke<ClipDuration>("get_clip_duration", { clipPath });
}

// ---- Publish commands ----
export interface Platform {
  id: string;
  name: string;
  supported: boolean;
  max_duration_seconds: number;
  max_file_size_mb: number;
  aspect_ratio: string;
}

export async function getSupportedPlatforms(): Promise<Platform[]> {
  return invoke<Platform[]>("get_supported_platforms");
}

// ---- License ----
export interface LicenseValidation {
  valid: boolean;
  tier: "free" | "pro" | "unlimited";
  expires_at: string | null;
  clips_remaining: number | null;
}

export async function validateLicense(key: string): Promise<LicenseValidation> {
  // In Phase 7, this will call the backend API
  // For now, validate key format locally
  const keyPattern = /^CLIP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!keyPattern.test(key)) {
    throw new Error("Invalid license key format. Expected: CLIP-XXXX-XXXX-XXXX-XXXX");
  }

  // Demo: keys starting with CLIP-PRO = pro tier
  const tier = key.startsWith("CLIP-PRO") ? "pro" : key.startsWith("CLIP-UNL") ? "unlimited" : "pro";
  return {
    valid: true,
    tier,
    expires_at: null,
    clips_remaining: null,
  };
}
