import { Activity, Clapperboard, Square, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStreamStore } from "../../store/streamStore";
import Button from "../Common/Button";
import { toast } from "../Common/Toast";
import { listen } from "@tauri-apps/api/event";

interface MomentEvent {
  timestamp: number;
  score: number;
  trigger_reason: string;
}

export default function LiveMonitor() {
  const { isMonitoring, streamUrl, currentPlatform, clipsGenerated, stopMonitoring } =
    useStreamStore();

  const [audioLevels, setAudioLevels] = useState<number[]>(Array(40).fill(0.1));
  const [chatVelocity, setChatVelocity] = useState<number[]>(Array(40).fill(0));
  const [moments, setMoments] = useState<MomentEvent[]>([]);
  const [stopping, setStopping] = useState(false);
  const audioIntervalRef = useRef<number | null>(null);

  // Simulate audio waveform animation while live
  useEffect(() => {
    if (!isMonitoring) return;

    audioIntervalRef.current = window.setInterval(() => {
      setAudioLevels((prev) => {
        const next = [...prev.slice(1)];
        next.push(0.1 + Math.random() * 0.9);
        return next;
      });
    }, 150);

    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isMonitoring]);

  // Listen for moment_detected events from Rust backend
  useEffect(() => {
    if (!isMonitoring) return;
    const unlisten = listen<MomentEvent>("moment_detected", (event) => {
      setMoments((prev) => [event.payload, ...prev].slice(0, 20));
      toast.info(
        `Moment detected! Score: ${Math.round(event.payload.score)}`,
        event.payload.trigger_reason,
      );
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [isMonitoring]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopMonitoring();
      toast.success("Monitoring stopped");
    } catch (err) {
      toast.error("Failed to stop", String(err));
    } finally {
      setStopping(false);
    }
  };

  if (!isMonitoring) return null;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="live-dot w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-semibold text-white">LIVE</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm text-dark-300 capitalize">{currentPlatform}</span>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-xs text-dark-500 truncate max-w-[200px]">{streamUrl}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-dark-400">
            <Clapperboard size={12} />
            <span>
              <span className="text-white font-semibold">{clipsGenerated}</span> clips
            </span>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={<Square size={12} />}
            loading={stopping}
            onClick={handleStop}
          >
            Stop
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Audio waveform */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-brand-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Audio Level
            </h3>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-brand-600/70 transition-all duration-150"
                style={{ height: `${level * 100}%`, minHeight: "2px" }}
              />
            ))}
          </div>
        </div>

        {/* Chat velocity */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={14} className="text-green-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Chat Velocity
            </h3>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {chatVelocity.map((level, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-green-600/50 transition-all duration-300"
                style={{ height: `${Math.min(level * 10, 100)}%`, minHeight: "2px" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent moments */}
      <div className="glass-card">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Detected Moments
          </h3>
        </div>
        {moments.length === 0 ? (
          <div className="py-8 text-center text-xs text-dark-500">
            Moments will appear here when detected
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {moments.map((m, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-blue badge">{m.trigger_reason}</span>
                  <span className="text-xs text-dark-400">
                    t+{m.timestamp.toFixed(0)}s
                  </span>
                </div>
                <span className="text-xs font-bold text-brand-400">
                  {Math.round(m.score)}pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
