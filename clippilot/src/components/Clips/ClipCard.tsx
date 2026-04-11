import { Clock, Eye, MoreVertical, Play, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Clip } from "../../store/clipStore";
import { formatDuration, formatRelativeTime, formatViews } from "../../utils/formatters";

interface ClipCardProps {
  clip: Clip;
  onPreview: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
  onPublish: (clip: Clip) => void;
  selected: boolean;
  onSelect: (id: number, selected: boolean) => void;
}

const statusColors: Record<string, string> = {
  ready: "badge-green",
  processing: "badge-yellow",
  published: "badge-blue",
  failed: "badge-red",
};

export default function ClipCard({
  clip,
  onPreview,
  onDelete,
  onPublish,
  selected,
  onSelect,
}: ClipCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`glass-card-hover overflow-hidden group cursor-pointer transition-all ${
        selected ? "ring-2 ring-brand-500/50 border-brand-500/30" : ""
      }`}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[9/16] bg-dark-700 overflow-hidden"
        onClick={() => onPreview(clip)}
      >
        {clip.thumbnail_path ? (
          <img
            src={`file://${clip.thumbnail_path}`}
            alt={clip.title ?? "Clip"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={28} className="text-dark-500" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={16} className="text-white ml-0.5" />
          </div>
        </div>

        {/* Duration */}
        {clip.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white">
            {formatDuration(clip.duration)}
          </div>
        )}

        {/* Score */}
        {clip.score != null && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-brand-600/80 backdrop-blur-sm text-[10px] font-bold text-white">
            {Math.round(clip.score)}
          </div>
        )}

        {/* Select checkbox */}
        <div
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(clip.id, !selected);
          }}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              selected
                ? "bg-brand-600 border-brand-600"
                : "border-white/30 bg-black/30 opacity-0 group-hover:opacity-100"
            }`}
          >
            {selected && (
              <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-current">
                <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-white truncate">
          {clip.title ?? "Untitled Clip"}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            <span className={`badge text-[10px] ${statusColors[clip.status] ?? "badge-gray"}`}>
              {clip.status}
            </span>
            {clip.views > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-dark-500">
                <Eye size={10} />
                {formatViews(clip.views)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-dark-500">
            <Clock size={10} />
            {formatRelativeTime(clip.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={() => onPublish(clip)}
            disabled={clip.status !== "ready"}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md
                       bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-[11px] font-medium
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-brand-500/20"
          >
            <Share2 size={11} />
            Publish
          </button>
          <button
            onClick={() => onDelete(clip)}
            className="p-1.5 rounded-md bg-dark-700/50 hover:bg-red-500/15 text-dark-400
                       hover:text-red-400 transition-all border border-white/5 hover:border-red-500/20"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
