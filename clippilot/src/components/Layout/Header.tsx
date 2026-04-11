import { Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useStreamStore } from "../../store/streamStore";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Overview of your clip activity" },
  "/clips": { title: "Clips Library", subtitle: "Browse and manage your generated clips" },
  "/streams": { title: "Stream Monitor", subtitle: "Connect and monitor live streams" },
  "/analytics": { title: "Analytics", subtitle: "Performance metrics and insights" },
  "/settings": { title: "Settings", subtitle: "Configure detection and preferences" },
  "/license": { title: "License", subtitle: "Manage your ClipPilot subscription" },
};

export default function Header() {
  const location = useLocation();
  const { isMonitoring, streamUrl } = useStreamStore();
  const page = PAGE_TITLES[location.pathname] ?? { title: "ClipPilot", subtitle: "" };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-dark-900/50 backdrop-blur-sm shrink-0">
      <div>
        <h1 className="text-base font-semibold text-white leading-tight">{page.title}</h1>
        {page.subtitle && (
          <p className="text-xs text-dark-400 mt-0.5">{page.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isMonitoring && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="truncate max-w-[140px]">
              {streamUrl ? new URL(streamUrl).pathname.slice(1) : "Live"}
            </span>
          </div>
        )}

        <button className="btn-ghost p-2 relative" title="Search">
          <Search size={16} />
        </button>
        <button className="btn-ghost p-2 relative" title="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
