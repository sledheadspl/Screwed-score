import { Clapperboard, Radio, Settings, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStreamStore } from "../../store/streamStore";

export default function QuickActions() {
  const navigate = useNavigate();
  const { isMonitoring } = useStreamStore();

  const actions = [
    {
      label: isMonitoring ? "Stop Monitoring" : "Start Monitoring",
      description: isMonitoring ? "Currently live" : "Connect to a stream",
      icon: <Radio size={20} />,
      color: isMonitoring
        ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
        : "bg-brand-600/15 border-brand-500/30 text-brand-400 hover:bg-brand-600/25",
      onClick: () => navigate("/streams"),
    },
    {
      label: "View All Clips",
      description: "Browse clip library",
      icon: <Clapperboard size={20} />,
      color:
        "bg-dark-700/50 border-white/5 text-dark-300 hover:bg-dark-600/50 hover:text-white",
      onClick: () => navigate("/clips"),
    },
    {
      label: "Detection Settings",
      description: "Tune sensitivity",
      icon: <Zap size={20} />,
      color:
        "bg-dark-700/50 border-white/5 text-dark-300 hover:bg-dark-600/50 hover:text-white",
      onClick: () => navigate("/settings"),
    },
    {
      label: "Account Settings",
      description: "Connect platforms",
      icon: <Settings size={20} />,
      color:
        "bg-dark-700/50 border-white/5 text-dark-300 hover:bg-dark-600/50 hover:text-white",
      onClick: () => navigate("/settings?tab=accounts"),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-150 text-left active:scale-95 ${action.color}`}
        >
          {action.icon}
          <div>
            <p className="text-sm font-semibold leading-tight">{action.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
