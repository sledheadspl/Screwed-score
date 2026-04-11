import { Link, Radio, Tv } from "lucide-react";
import { useState } from "react";
import Button from "../Common/Button";
import { useStreamStore } from "../../store/streamStore";
import { toast } from "../Common/Toast";

const PLATFORM_EXAMPLES: Record<string, string> = {
  twitch: "https://www.twitch.tv/shroud",
  youtube: "https://www.youtube.com/watch?v=LIVE_ID",
  kick: "https://kick.com/trainwreckstv",
};

export default function StreamConnect() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<"twitch" | "youtube" | "kick">("twitch");
  const [connecting, setConnecting] = useState(false);
  const { startMonitoring, isMonitoring } = useStreamStore();

  const handleConnect = async () => {
    if (!url.trim()) {
      toast.error("Enter a stream URL", "Please provide a valid stream URL.");
      return;
    }
    setConnecting(true);
    try {
      await startMonitoring(url.trim(), platform);
      toast.success("Monitoring started", `Now watching ${url}`);
      setUrl("");
    } catch (err) {
      toast.error("Failed to connect", String(err));
    } finally {
      setConnecting(false);
    }
  };

  if (isMonitoring) return null;

  return (
    <div className="glass-card p-6 max-w-xl">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
          <Radio size={16} className="text-brand-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Connect Stream</h3>
          <p className="text-xs text-dark-400">Paste a stream URL to start monitoring</p>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-dark-900/50 rounded-lg">
        {(["twitch", "youtube", "kick"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all capitalize ${
              platform === p
                ? "bg-dark-700 text-white shadow"
                : "text-dark-400 hover:text-white"
            }`}
          >
            {p === "youtube" ? "YouTube" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500"
          />
          <input
            className="input-field pl-8 selectable"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={PLATFORM_EXAMPLES[platform]}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
        </div>
        <Button
          variant="primary"
          loading={connecting}
          onClick={handleConnect}
          icon={<Tv size={14} />}
        >
          Monitor
        </Button>
      </div>

      <p className="text-xs text-dark-500 mt-3">
        Requires{" "}
        <span className="text-dark-300">
          {platform === "twitch" ? "streamlink" : "yt-dlp"}
        </span>{" "}
        installed on your system. FFmpeg is bundled.
      </p>
    </div>
  );
}
