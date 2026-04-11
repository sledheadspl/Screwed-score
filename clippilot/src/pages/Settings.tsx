import { useSearchParams } from "react-router-dom";
import AccountConnections from "../components/Settings/AccountConnections";
import ClipStyleSettings from "../components/Settings/ClipStyleSettings";
import DetectionSettings from "../components/Settings/DetectionSettings";
import LicenseSettings from "../components/Settings/LicenseSettings";

const TABS = [
  { id: "detection", label: "Detection" },
  { id: "style", label: "Style" },
  { id: "accounts", label: "Accounts" },
  { id: "license", label: "License" },
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "detection";

  const setTab = (t: string) => setParams({ tab: t });

  return (
    <div className="flex h-full">
      {/* Tab sidebar */}
      <div className="w-40 shrink-0 border-r border-white/5 p-3 space-y-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-brand-600/15 text-brand-300 border border-brand-500/20"
                : "text-dark-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "detection" && <DetectionSettings />}
        {tab === "style" && <ClipStyleSettings />}
        {tab === "accounts" && <AccountConnections />}
        {tab === "license" && <LicenseSettings />}
      </div>
    </div>
  );
}
