import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStreamStore } from "../store/streamStore";
import { useClipStore } from "../store/clipStore";
import { toast } from "../components/Common/Toast";

interface ClipReadyPayload {
  clip_id: number;
  score: number;
  trigger_reason: string;
  file_path: string;
  duration: number;
}

/**
 * useStream — subscribes to Tauri stream events and wires them
 * to the Zustand stores.
 *
 * Mount this hook once at the app level (e.g. App.tsx).
 */
export function useStreamEvents() {
  const { incrementClipsGenerated } = useStreamStore();
  const { fetchClips } = useClipStore();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    // Clip ready → refresh library
    listen<ClipReadyPayload>("clip_ready", (e) => {
      incrementClipsGenerated();
      fetchClips();
      toast.success(
        `New clip ready! Score: ${Math.round(e.payload.score)}`,
        e.payload.trigger_reason,
      );
    }).then((fn) => unlisteners.push(fn));

    // Stream disconnected unexpectedly
    listen("stream_error", (e) => {
      const msg = String((e.payload as { message?: string }).message ?? e.payload);
      toast.error("Stream error", msg);
    }).then((fn) => unlisteners.push(fn));

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [incrementClipsGenerated, fetchClips]);
}

export function useStream() {
  return useStreamStore();
}
