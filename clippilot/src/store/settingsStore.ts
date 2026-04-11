import { create } from "zustand";
import { db } from "../api/tauri";
import { INIT_SQL } from "../db/schema";

export interface KeywordConfig {
  word: string;
  points: number;
}

export interface AppSettings {
  id: number;
  license_key: string | null;
  license_status: "free" | "pro" | "unlimited";
  detection_sensitivity: number;
  audio_weight: number;
  chat_weight: number;
  pre_roll_seconds: number;
  post_roll_seconds: number;
  clip_length_max: number;
  cooldown_seconds: number;
  keywords: KeywordConfig[];
  caption_font: string;
  caption_color: string;
  caption_outline_color: string;
  caption_animation: string;
  watermark_enabled: number;
  auto_publish: number;
  clips_used_this_month: number;
  usage_reset_at: string | null;
}

export interface StreamAccount {
  id: number;
  platform: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  access_token: string | null;
  is_active: number;
  created_at: string;
}

export interface SocialAccount {
  id: number;
  platform: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  access_token: string | null;
  is_active: number;
  created_at: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  license_key: null,
  license_status: "free",
  detection_sensitivity: 50,
  audio_weight: 0.3,
  chat_weight: 0.3,
  pre_roll_seconds: 5,
  post_roll_seconds: 10,
  clip_length_max: 30,
  cooldown_seconds: 60,
  keywords: [],
  caption_font: "Montserrat",
  caption_color: "#FFFFFF",
  caption_outline_color: "#000000",
  caption_animation: "none",
  watermark_enabled: 1,
  auto_publish: 0,
  clips_used_this_month: 0,
  usage_reset_at: null,
};

interface SettingsStore {
  settings: AppSettings;
  streamAccounts: StreamAccount[];
  socialAccounts: SocialAccount[];
  initialized: boolean;
  initializeDb: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  fetchStreamAccounts: () => Promise<void>;
  addStreamAccount: (platform: string, username: string, token: string) => Promise<void>;
  removeStreamAccount: (id: number) => Promise<void>;
  fetchSocialAccounts: () => Promise<void>;
  addSocialAccount: (platform: string, username: string, token: string) => Promise<void>;
  removeSocialAccount: (id: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  streamAccounts: [],
  socialAccounts: [],
  initialized: false,

  initializeDb: async () => {
    if (get().initialized) return;
    try {
      // Run schema migrations
      for (const stmt of INIT_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
        await db.execute(stmt);
      }
      set({ initialized: true });
      await get().fetchSettings();
      await get().fetchStreamAccounts();
      await get().fetchSocialAccounts();
    } catch (err) {
      console.error("DB initialization failed:", err);
    }
  },

  fetchSettings: async () => {
    try {
      const rows = await db.select<AppSettings[]>("SELECT * FROM settings WHERE id = 1");
      if (rows.length > 0) {
        const row = rows[0];
        // Parse keywords JSON
        const keywords =
          typeof row.keywords === "string"
            ? JSON.parse(row.keywords || "[]")
            : row.keywords ?? [];
        set({ settings: { ...DEFAULT_SETTINGS, ...row, keywords } });
      }
    } catch (err) {
      console.error("fetchSettings failed:", err);
    }
  },

  updateSettings: async (updates) => {
    const current = get().settings;
    const merged = { ...current, ...updates };

    // Serialize keywords to JSON for storage
    const keywordsJson = JSON.stringify(merged.keywords ?? []);

    try {
      await db.execute(
        `UPDATE settings SET
          license_key = $1,
          license_status = $2,
          detection_sensitivity = $3,
          audio_weight = $4,
          chat_weight = $5,
          pre_roll_seconds = $6,
          post_roll_seconds = $7,
          clip_length_max = $8,
          cooldown_seconds = $9,
          keywords = $10,
          caption_font = $11,
          caption_color = $12,
          caption_outline_color = $13,
          caption_animation = $14,
          watermark_enabled = $15,
          auto_publish = $16,
          clips_used_this_month = $17,
          updated_at = datetime('now')
        WHERE id = 1`,
        [
          merged.license_key,
          merged.license_status,
          merged.detection_sensitivity,
          merged.audio_weight,
          merged.chat_weight,
          merged.pre_roll_seconds,
          merged.post_roll_seconds,
          merged.clip_length_max,
          merged.cooldown_seconds,
          keywordsJson,
          merged.caption_font,
          merged.caption_color,
          merged.caption_outline_color,
          merged.caption_animation,
          merged.watermark_enabled,
          merged.auto_publish,
          merged.clips_used_this_month,
        ],
      );
      set({ settings: merged });
    } catch (err) {
      console.error("updateSettings failed:", err);
      throw err;
    }
  },

  fetchStreamAccounts: async () => {
    try {
      const rows = await db.select<StreamAccount[]>(
        "SELECT * FROM stream_accounts WHERE is_active = 1 ORDER BY created_at DESC",
      );
      set({ streamAccounts: rows });
    } catch (err) {
      console.error("fetchStreamAccounts failed:", err);
    }
  },

  addStreamAccount: async (platform, username, token) => {
    await db.execute(
      "INSERT INTO stream_accounts (platform, username, access_token) VALUES ($1, $2, $3)",
      [platform, username, token],
    );
    await get().fetchStreamAccounts();
  },

  removeStreamAccount: async (id) => {
    await db.execute("UPDATE stream_accounts SET is_active = 0 WHERE id = $1", [id]);
    await get().fetchStreamAccounts();
  },

  fetchSocialAccounts: async () => {
    try {
      const rows = await db.select<SocialAccount[]>(
        "SELECT * FROM social_accounts WHERE is_active = 1 ORDER BY created_at DESC",
      );
      set({ socialAccounts: rows });
    } catch (err) {
      console.error("fetchSocialAccounts failed:", err);
    }
  },

  addSocialAccount: async (platform, username, token) => {
    await db.execute(
      "INSERT INTO social_accounts (platform, username, access_token) VALUES ($1, $2, $3)",
      [platform, username, token],
    );
    await get().fetchSocialAccounts();
  },

  removeSocialAccount: async (id) => {
    await db.execute("UPDATE social_accounts SET is_active = 0 WHERE id = $1", [id]);
    await get().fetchSocialAccounts();
  },
}));
