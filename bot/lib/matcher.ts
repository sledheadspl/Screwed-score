import { youtube_v3 } from "googleapis";
import { PROFANITY, SPAM_CONFIG, RESPONSE_COOLDOWNS } from "../config/triggers.js";
import { classifyMessage } from "./classify.js";
import type { ResponseKey } from "../config/responses.js";

export type Action =
  | { type: "respond"; key: ResponseKey }
  | { type: "delete_warn"; messageId: string; userId: string; reason: "profanity" | "spam" }
  | { type: "mute"; messageId: string; userId: string };

const userMessages: Map<string, number[]> = new Map();
const spamWarned: Set<string> = new Set();
const lastFired: Map<string, number> = new Map();

export async function matchMessage(
  msg: youtube_v3.Schema$LiveChatMessage
): Promise<Action | null> {
  const messageId = msg.id;
  const userId = msg.authorDetails?.channelId;
  const text = msg.snippet?.textMessageDetails?.messageText ?? "";
  const lower = text.toLowerCase();

  if (!messageId || !userId) return null;

  // Profanity check
  if (PROFANITY.length > 0 && PROFANITY.some((word) => lower.includes(word))) {
    return { type: "delete_warn", messageId, userId, reason: "profanity" };
  }

  // Spam check
  const now = Date.now();
  const windowMs = SPAM_CONFIG.windowSeconds * 1000;
  const timestamps = (userMessages.get(userId) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  userMessages.set(userId, timestamps);

  if (timestamps.length > SPAM_CONFIG.maxMessages) {
    if (spamWarned.has(userId)) {
      spamWarned.delete(userId);
      return { type: "mute", messageId, userId };
    } else {
      spamWarned.add(userId);
      setTimeout(() => spamWarned.delete(userId), windowMs * 3);
      return { type: "delete_warn", messageId, userId, reason: "spam" };
    }
  }

  // AI question classification
  try {
    const key = await classifyMessage(text);
    if (key && canFire(key)) {
      return { type: "respond", key };
    }
  } catch (err: any) {
    console.error("[classify] Error:", err?.message ?? err);
  }

  return null;
}

function canFire(key: ResponseKey): boolean {
  const cooldown = (RESPONSE_COOLDOWNS[key] ?? 120) * 1000;
  const last = lastFired.get(key) ?? 0;
  if (Date.now() - last < cooldown) return false;
  lastFired.set(key, Date.now());
  return true;
}
