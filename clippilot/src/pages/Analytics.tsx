import { BarChart3, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useClipStore } from "../store/clipStore";
import { formatViews } from "../utils/formatters";

export default function Analytics() {
  const { clips, fetchClips } = useClipStore();

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const totalViews = clips.reduce((s, c) => s + (c.views ?? 0), 0);
  const publishedClips = clips.filter((c) => c.status === "published");
  const avgScore =
    clips.length > 0
      ? Math.round(clips.reduce((s, c) => s + (c.score ?? 0), 0) / clips.length)
      : 0;

  // Group clips by day for the chart
  const byDay: Record<string, number> = {};
  clips.forEach((c) => {
    const day = c.created_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  });
  const days = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);
  const maxDay = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clips", value: clips.length, icon: <BarChart3 size={18} />, color: "text-brand-400" },
          { label: "Published", value: publishedClips.length, icon: <TrendingUp size={18} />, color: "text-green-400" },
          { label: "Total Views", value: formatViews(totalViews), icon: <BarChart3 size={18} />, color: "text-purple-400" },
          { label: "Avg Score", value: avgScore, icon: <TrendingUp size={18} />, color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-dark-400 uppercase tracking-wider">{s.label}</span>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clips over time chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Clips Generated (Last 14 Days)</h3>
        {days.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-dark-500">
            No clip data yet
          </div>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {days.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                  <div
                    className="w-full rounded-t-sm bg-brand-600/70 hover:bg-brand-500/70 transition-colors"
                    style={{ height: `${(count / maxDay) * 100}%`, minHeight: "4px" }}
                    title={`${count} clips on ${day}`}
                  />
                </div>
                <span className="text-[9px] text-dark-500 hidden lg:block">
                  {day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top clips */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Top Clips by Score</h3>
        </div>
        {clips.length === 0 ? (
          <div className="py-8 text-center text-xs text-dark-500">No clips yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {clips
              .filter((c) => c.score != null)
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
              .slice(0, 10)
              .map((clip) => (
                <div key={clip.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded bg-brand-600/20 text-brand-400 text-xs font-bold w-12 text-center">
                    {Math.round(clip.score ?? 0)}
                  </div>
                  <p className="flex-1 text-sm text-white truncate">
                    {clip.title ?? `Clip #${clip.id}`}
                  </p>
                  <span className="text-xs text-dark-500 capitalize">{clip.status}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
