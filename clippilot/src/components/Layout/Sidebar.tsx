import { motion } from "framer-motion";
import {
  BarChart3,
  Clapperboard,
  LayoutDashboard,
  Radio,
  Settings,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useStreamStore } from "../../store/streamStore";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clips", icon: Clapperboard, label: "Clips" },
  { to: "/streams", icon: Radio, label: "Streams" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { isMonitoring, currentPlatform } = useStreamStore();

  return (
    <aside className="w-16 lg:w-56 flex flex-col bg-dark-900 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="hidden lg:block font-bold text-white text-base tracking-tight">
            ClipPilot
          </span>
        </div>
      </div>

      {/* Live indicator */}
      {isMonitoring && (
        <div className="mx-3 mt-3 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hidden lg:flex items-center gap-2">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-400 truncate">
            Live · {currentPlatform}
          </span>
        </div>
      )}
      {isMonitoring && (
        <div className="mx-3 mt-3 flex lg:hidden justify-center">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group
              ${
                isActive
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-dark-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? "text-brand-400" : "text-dark-400 group-hover:text-white"}`}
                  size={18}
                />
                <span className="hidden lg:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* License badge */}
      <div className="p-3 border-t border-white/5">
        <NavLink
          to="/license"
          className="hidden lg:flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-dark-400
                     hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-dark-700 text-dark-300 border border-white/10 uppercase tracking-wide">
            Free
          </div>
          <span>Upgrade Plan</span>
        </NavLink>
        <NavLink
          to="/license"
          className="flex lg:hidden justify-center px-2.5 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5"
        >
          <div className="w-2 h-2 rounded-full bg-yellow-500" title="Free plan" />
        </NavLink>
      </div>
    </aside>
  );
}
