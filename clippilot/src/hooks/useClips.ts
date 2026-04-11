import { useCallback } from "react";
import { useClipStore } from "../store/clipStore";
import { generateThumbnail, getClipDuration } from "../api/tauri";
import { toast } from "../components/Common/Toast";

/**
 * useClips — Business logic hook for clip operations.
 * All Tauri interactions isolated here for future mobile port.
 */
export function useClips() {
  const store = useClipStore();

  const refreshThumbnail = useCallback(async (clipId: number, filePath: string) => {
    try {
      const result = await generateThumbnail(filePath);
      if (result.success) {
        await store.updateClip(clipId, { thumbnail_path: result.path });
      }
    } catch (err) {
      console.error("Failed to refresh thumbnail:", err);
    }
  }, [store]);

  const enrichClipMetadata = useCallback(async (clipId: number, filePath: string) => {
    try {
      const meta = await getClipDuration(filePath);
      await store.updateClip(clipId, { duration: meta.duration });
    } catch (err) {
      console.error("Failed to enrich clip metadata:", err);
    }
  }, [store]);

  const confirmDelete = useCallback(async (clipId: number, title: string | null) => {
    // In Phase 5 this will show a confirmation modal
    await store.deleteClip(clipId);
    toast.success("Clip deleted", title ?? undefined);
  }, [store]);

  return {
    ...store,
    refreshThumbnail,
    enrichClipMetadata,
    confirmDelete,
  };
}
