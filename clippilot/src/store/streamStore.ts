import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { db } from "../api/tauri";

export interface Stream {
  id: number;
  platform: string;
  stream_url: string | null;
  stream_id: string | null;
  title: string | null;
  game: string | null;
  started_at: string | null;
  ended_at: string | null;
  clips_generated: number;
  created_at: string;
}

interface StreamStore {
  streams: Stream[];
  isMonitoring: boolean;
  streamUrl: string | null;
  currentPlatform: string | null;
  currentStreamId: number | null;
  clipsGenerated: number;
  fetchStreams: () => Promise<void>;
  startMonitoring: (url: string, platform: string) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  incrementClipsGenerated: () => void;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  streams: [],
  isMonitoring: false,
  streamUrl: null,
  currentPlatform: null,
  currentStreamId: null,
  clipsGenerated: 0,

  fetchStreams: async () => {
    try {
      const rows = await db.select<Stream[]>(
        "SELECT * FROM streams ORDER BY created_at DESC LIMIT 50",
      );
      set({ streams: rows });
    } catch (err) {
      console.error("fetchStreams failed:", err);
    }
  },

  startMonitoring: async (url, platform) => {
    // Create stream session record
    const result = await db.execute(
      "INSERT INTO streams (platform, stream_url, started_at) VALUES ($1, $2, datetime('now'))",
      [platform, url],
    );
    const streamId = result.lastInsertId as number;

    // Invoke Rust backend
    await invoke("start_monitoring", {
      payload: { url, platform, stream_id: streamId },
    });

    set({
      isMonitoring: true,
      streamUrl: url,
      currentPlatform: platform,
      currentStreamId: streamId,
      clipsGenerated: 0,
    });

    await get().fetchStreams();
  },

  stopMonitoring: async () => {
    await invoke("stop_monitoring");

    const { currentStreamId } = get();
    if (currentStreamId) {
      await db.execute(
        "UPDATE streams SET ended_at = datetime('now'), clips_generated = $1 WHERE id = $2",
        [get().clipsGenerated, currentStreamId],
      );
    }

    set({
      isMonitoring: false,
      streamUrl: null,
      currentPlatform: null,
      currentStreamId: null,
    });

    await get().fetchStreams();
  },

  incrementClipsGenerated: () => {
    set((s) => ({ clipsGenerated: s.clipsGenerated + 1 }));
  },
}));
