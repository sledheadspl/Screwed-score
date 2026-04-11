import { Calendar, Clapperboard, Clock } from "lucide-react";
import { Stream } from "../../store/streamStore";
import { formatRelativeTime } from "../../utils/formatters";

interface StreamHistoryProps {
  streams: Stream[];
}

const platformColors: Record<string, string> = {
  twitch: "text-purple-400 bg-purple-500/15 border-purple-500/20",
  youtube: "text-red-400 bg-red-500/15 border-red-500/20",
  kick: "text-green-400 bg-green-500/15 border-green-500/20",
};

export default function StreamHistory({ streams }: StreamHistoryProps) {
  if (streams.length === 0) {
    return (
      <div className="glass-card py-10 text-center">
        <Clock size={24} className="text-dark-500 mx-auto mb-2" />
        <p className="text-sm text-dark-400">No stream history yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Stream History</h3>
      </div>
      <div className="divide-y divide-white/5">
        {streams.map((stream) => {
          const duration =
            stream.started_at && stream.ended_at
              ? Math.round(
                  (new Date(stream.ended_at).getTime() -
                    new Date(stream.started_at).getTime()) /
                    60000,
                )
              : null;

          return (
            <div key={stream.id} className="px-4 py-3 flex items-center gap-3">
              <span
                className={`badge border ${platformColors[stream.platform] ?? "badge-gray"}`}
              >
                {stream.platform}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {stream.title ?? stream.stream_url ?? "Unknown stream"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-xs text-dark-500">
                    <Calendar size={10} />
                    {formatRelativeTime(stream.started_at)}
                  </span>
                  {duration != null && (
                    <span className="flex items-center gap-0.5 text-xs text-dark-500">
                      <Clock size={10} />
                      {duration}m
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-dark-400">
                <Clapperboard size={12} />
                <span>{stream.clips_generated} clips</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
