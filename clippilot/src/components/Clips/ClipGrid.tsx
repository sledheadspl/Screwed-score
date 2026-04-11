import { Loader2 } from "lucide-react";
import { Clip } from "../../store/clipStore";
import ClipCard from "./ClipCard";

interface ClipGridProps {
  clips: Clip[];
  loading: boolean;
  selectedIds: Set<number>;
  onPreview: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
  onPublish: (clip: Clip) => void;
  onSelect: (id: number, selected: boolean) => void;
}

export default function ClipGrid({
  clips,
  loading,
  selectedIds,
  onPreview,
  onDelete,
  onPublish,
  onSelect,
}: ClipGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-dark-500" />
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-dark-400 text-sm">No clips found</p>
        <p className="text-dark-600 text-xs mt-1">
          Clips will appear here after monitoring a stream
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {clips.map((clip) => (
        <ClipCard
          key={clip.id}
          clip={clip}
          selected={selectedIds.has(clip.id)}
          onPreview={onPreview}
          onDelete={onDelete}
          onPublish={onPublish}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
