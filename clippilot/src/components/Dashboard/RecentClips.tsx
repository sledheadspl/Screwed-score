import { ChevronRight, Clock, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Clip } from "../../store/clipStore";
import { formatDuration, formatRelativeTime, formatViews } from "../../utils/formatters";

interface RecentClipsProps {
  clips: Clip[];
}

const statusColors: Record<string, string> = {
  ready: "badge-green",
  processing: "badge-yellow",
  published: "badge-blue",
  failed: "badge-red",
};

export default function RecentClips({ clips }: RecentClipsProps) {
  if (clips.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-3">
          <Play size={20} className="text-dark-400" />
        </div>
        <p className="text-sm text-dark-400">No clips yet</p>
        <p className="text-xs text-dark-600 mt-1">
          Start monitoring a stream to generate clips automatically
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Recent Clips</h3>
        <Link
          to="/clips"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Horizontal scroll of clip cards */}
      <div className="flex gap-3 p-4 overflow-x-auto scrollbar-thin">
        {clips.slice(0, 10).map((clip) => (
          <div
            key={clip.id}
            className="shrink-0 w-40 group cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="relative w-full aspect-[9/16] rounded-lg bg-dark-700 overflow-hidden mb-2 border border-white/5 group-hover:border-white/10 transition-all">
              {clip.thumbnail_path ? (
                <img
                  src={`file://${clip.thumbnail_path}`}
                  alt={clip.title ?? "Clip thumbnail"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={24} className="text-dark-500" />
                </div>
              )}
              {/* Duration badge */}
              {clip.duration && (
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white">
                  {formatDuration(clip.duration)}
                </div>
              )}
              {/* Score badge */}
              {clip.score && (
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-600/80 text-[10px] font-bold text-white">
                  {Math.round(clip.score)}
                </div>
              )}
            </div>

            <p className="text-xs font-medium text-white truncate">
              {clip.title ?? "Untitled Clip"}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-dark-500" />
              <span className="text-[10px] text-dark-500">
                {formatRelativeTime(clip.created_at)}
              </span>
            </div>
            <div className="mt-1">
              <span className={`badge text-[10px] ${statusColors[clip.status] ?? "badge-gray"}`}>
                {clip.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
