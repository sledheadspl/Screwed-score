import { useEffect } from "react";
import LiveMonitor from "../components/Streams/LiveMonitor";
import StreamConnect from "../components/Streams/StreamConnect";
import StreamHistory from "../components/Streams/StreamHistory";
import { useStreamStore } from "../store/streamStore";

export default function Streams() {
  const { streams, isMonitoring, fetchStreams } = useStreamStore();

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {!isMonitoring && <StreamConnect />}
      {isMonitoring && <LiveMonitor />}
      <StreamHistory streams={streams} />
    </div>
  );
}
