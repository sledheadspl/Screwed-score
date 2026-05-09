import { youtube_v3 } from "googleapis";
import { AUTO_TRIGGERS, PROFANITY, SPAM_CONFIG } from "../config/triggers.js";

export type Action =
  | { type: "respond"; key: string }
  | { type: "delete_warn"; messageId: string; userId: string; reason: "profanity" | "spam" }
  | { type: "mute"; messageId: string; userId: string };

// Per-user message timestamps for spam detection (sliding window)
const userMessages: Map<string, number[]> = new Map();
// Users who have already received a spam warning (pending mute on next violation)
const spamWarned: Set<string> = new Set();
// Cooldown tracker for auto-response keys
const lastFired: Map<string, number> = new Map();

export function matchMessage(
  msg: youtube_v3.Schema$LiveChatMessage
): Action | null {
  const messageId = msg.id;
  const userId = msg.authorDetails?.channelId;
  const text = msg.snippet?.textMessageDetails?.messageText ?? "";
  const lower = text.toLowerCase();

  if (!messageId || !userId) return null;

  // --- Profanity check ---
  if (PROFANITY.some((word) => lower.includes(word))) {
    return { type: "delete_warn", messageId, userId, reason: "profanity" };
  }

  // --- Spam check ---
  const now = Date.now();
  const windowMs = SPAM_CONFIG.windowSeconds * 1000;
  const timestamps = (userMessages.get(userId) ?? []).filter(
    (t) => now - t < windowMs
  );
  timestamps.push(now);
  userMessages.set(userId, timestamps);

  if (timestamps.length > SPAM_CONFIG.maxMessages) {
    if (spamWarned.has(userId)) {
      // Second offense → mute
      spamWarned.delete(userId);
      return { type: "mute", messageId, userId };
    } else {
      // First offense → warn
      spamWarned.add(userId);
      // Clear the warned status after the window so they get a fresh chance
      setTimeout(() => spamWarned.delete(userId), windowMs * 3);
      return { type: "delete_warn", messageId, userId, reason: "spam" };
    }
  }

  // --- Auto-keyword triggers ---
  for (const rule of AUTO_TRIGGERS) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      if (canFire(rule.key, rule.cooldownSeconds)) {
        return { type: "respond", key: rule.key };
      }
      return null;
    }
  }

  return null;
}

function canFire(key: string, cooldownSeconds: number): boolean {
  const last = lastFired.get(key) ?? 0;
  if (Date.now() - last < cooldownSeconds * 1000) return false;
  lastFired.set(key, Date.now());
  return true;
}
