import { Filter, LayoutGrid, List, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ClipEditor from "../components/Clips/ClipEditor";
import ClipGrid from "../components/Clips/ClipGrid";
import ClipPreview from "../components/Clips/ClipPreview";
import PublishModal from "../components/Clips/PublishModal";
import Button from "../components/Common/Button";
import { toast } from "../components/Common/Toast";
import { Clip, useClipStore } from "../store/clipStore";

type StatusFilter = "all" | "ready" | "processing" | "published" | "failed";
type SortBy = "created_at" | "score" | "views";

export default function Clips() {
  const { clips, loading, fetchClips, deleteClip, publishClip } = useClipStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [publishClip_, setPublishClip] = useState<Clip | null>(null);
  const [editClip, setEditClip] = useState<Clip | null>(null);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const filtered = clips
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
      if (sortBy === "views") return (b.views ?? 0) - (a.views ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteClip(id);
    }
    toast.success(`Deleted ${selectedIds.size} clips`);
    setSelectedIds(new Set());
  };

  const handleDelete = async (clip: Clip) => {
    await deleteClip(clip.id);
    toast.success("Clip deleted");
  };

  const handlePublish = async (
    clipId: number,
    platforms: string[],
    title: string,
    description: string,
    hashtags: string[],
  ) => {
    await publishClip(clipId, platforms, title, description, hashtags);
    toast.success("Clip queued for publishing");
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex gap-1 p-1 bg-dark-800/60 rounded-lg">
            {(["all", "ready", "processing", "published", "failed"] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                    statusFilter === s
                      ? "bg-dark-700 text-white shadow"
                      : "text-dark-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ),
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="input-field !w-auto text-xs py-1"
          >
            <option value="created_at">Newest</option>
            <option value="score">Highest Score</option>
            <option value="views">Most Views</option>
          </select>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-400">{selectedIds.size} selected</span>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={handleDeleteSelected}
            >
              Delete
            </Button>
          </div>
        )}

        <p className="text-xs text-dark-500 ml-auto">
          {filtered.length} / {clips.length} clips
        </p>
      </div>

      {/* Grid */}
      <ClipGrid
        clips={filtered}
        loading={loading}
        selectedIds={selectedIds}
        onPreview={setPreviewClip}
        onDelete={handleDelete}
        onPublish={setPublishClip}
        onSelect={handleSelect}
      />

      {/* Modals */}
      <ClipPreview
        clip={previewClip}
        onClose={() => setPreviewClip(null)}
        onPublish={setPublishClip}
        onDelete={handleDelete}
      />
      <PublishModal
        clip={publishClip_}
        onClose={() => setPublishClip(null)}
        onPublish={handlePublish}
      />
      <ClipEditor clip={editClip} onClose={() => setEditClip(null)} />
    </div>
  );
}
