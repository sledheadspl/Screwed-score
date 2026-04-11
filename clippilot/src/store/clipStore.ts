import { create } from "zustand";
import { db } from "../api/tauri";

export interface Clip {
  id: number;
  stream_id: number | null;
  status: "processing" | "ready" | "published" | "failed";
  score: number | null;
  trigger_reason: string | null;
  start_time: number | null;
  end_time: number | null;
  duration: number | null;
  file_path: string | null;
  thumbnail_path: string | null;
  transcript: string | null;
  title: string | null;
  description: string | null;
  hashtags: string[] | null;
  views: number;
  created_at: string;
  updated_at: string;
}

interface ClipStore {
  clips: Clip[];
  loading: boolean;
  fetchClips: () => Promise<void>;
  getClip: (id: number) => Promise<Clip | null>;
  insertClip: (clip: Omit<Clip, "id" | "created_at" | "updated_at">) => Promise<number>;
  updateClip: (id: number, updates: Partial<Clip>) => Promise<void>;
  deleteClip: (id: number) => Promise<void>;
  publishClip: (
    clipId: number,
    platforms: string[],
    title: string,
    description: string,
    hashtags: string[],
  ) => Promise<void>;
}

export const useClipStore = create<ClipStore>((set, get) => ({
  clips: [],
  loading: false,

  fetchClips: async () => {
    set({ loading: true });
    try {
      const rows = await db.select<Clip[]>(
        "SELECT * FROM clips ORDER BY created_at DESC LIMIT 200",
      );
      const clips = rows.map((r) => ({
        ...r,
        hashtags:
          typeof r.hashtags === "string" ? JSON.parse(r.hashtags || "[]") : r.hashtags ?? [],
      }));
      set({ clips });
    } catch (err) {
      console.error("fetchClips failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  getClip: async (id) => {
    const rows = await db.select<Clip[]>("SELECT * FROM clips WHERE id = $1", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      hashtags:
        typeof r.hashtags === "string" ? JSON.parse(r.hashtags || "[]") : r.hashtags ?? [],
    };
  },

  insertClip: async (clip) => {
    const result = await db.execute(
      `INSERT INTO clips
        (stream_id, status, score, trigger_reason, start_time, end_time, duration,
         file_path, thumbnail_path, transcript, title, description, hashtags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        clip.stream_id,
        clip.status,
        clip.score,
        clip.trigger_reason,
        clip.start_time,
        clip.end_time,
        clip.duration,
        clip.file_path,
        clip.thumbnail_path,
        clip.transcript,
        clip.title,
        clip.description,
        JSON.stringify(clip.hashtags ?? []),
      ],
    );
    await get().fetchClips();
    return result.lastInsertId as number;
  },

  updateClip: async (id, updates) => {
    const fields = Object.keys(updates)
      .map((k, i) => `${k} = $${i + 2}`)
      .join(", ");
    const values = Object.values(updates).map((v) =>
      Array.isArray(v) ? JSON.stringify(v) : v,
    );
    await db.execute(
      `UPDATE clips SET ${fields}, updated_at = datetime('now') WHERE id = $1`,
      [id, ...values],
    );
    await get().fetchClips();
  },

  deleteClip: async (id) => {
    await db.execute("DELETE FROM clips WHERE id = $1", [id]);
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id) }));
  },

  publishClip: async (clipId, platforms, title, description, hashtags) => {
    // Update the clip metadata
    await get().updateClip(clipId, {
      title,
      description,
      hashtags,
    });

    // Insert into publish queue for each platform
    for (const platform of platforms) {
      await db.execute(
        "INSERT INTO publish_queue (clip_id, platform, status) VALUES ($1, $2, 'queued')",
        [clipId, platform],
      );
    }

    await get().fetchClips();
  },
}));
