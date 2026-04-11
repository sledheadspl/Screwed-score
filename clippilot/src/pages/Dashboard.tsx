import { useEffect } from "react";
import QuickActions from "../components/Dashboard/QuickActions";
import RecentClips from "../components/Dashboard/RecentClips";
import StatsCards from "../components/Dashboard/StatsCards";
import { useClipStore } from "../store/clipStore";
import { useStreamStore } from "../store/streamStore";

export default function Dashboard() {
  const { clips, fetchClips } = useClipStore();
  const { streams } = useStreamStore();

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const today = new Date().toDateString();
  const clipsToday = clips.filter(
    (c) => new Date(c.created_at).toDateString() === today,
  ).length;

  const totalViews = clips.reduce((sum, c) => sum + (c.views ?? 0), 0);
  const queueSize = clips.filter((c) => c.status === "processing").length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <StatsCards
        clipsToday={clipsToday}
        totalViews={totalViews}
        followersGained={0}
        queueSize={queueSize}
      />
      <QuickActions />
      <RecentClips clips={clips} />
    </div>
  );
}
