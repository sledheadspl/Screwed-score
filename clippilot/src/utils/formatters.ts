/**
 * UI formatting utilities.
 * Pure functions — no Tauri or browser-specific APIs so they work in React Native too.
 */

/** Format seconds to mm:ss or hh:mm:ss */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Relative time: "2 minutes ago", "3 hours ago", etc. */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (diffMs < 60000) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Format view counts: 1200 → "1.2K", 1500000 → "1.5M" */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

/** Format file size in MB */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/** Format a score 0–100 with color class */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format ISO date string to locale date */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Generate clip title from stream and timestamp */
export function generateClipTitle(platform: string, triggerReason: string, timestamp: number): string {
  const mins = Math.floor(timestamp / 60);
  const reason = triggerReason.replace(/_/g, " ");
  return `${capitalize(platform)} clip — ${reason} at ${mins}m`;
}
