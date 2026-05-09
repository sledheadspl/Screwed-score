import { youtube_v3 } from "googleapis";
import { PROFANITY_PATTERNS, SPAM_CONFIG, RESPONSE_COOLDOWNS } from "../config/triggers.js";
import { classifyMessage } from "./classify.js";
import type { ResponseKey } from "../config/responses.js";

export type Action =
  | { type: "respond"; key: ResponseKey }
  | { type: "hype" }
  | { type: "delete_warn"; messageId: string; userId: string; reason: "profanity" | "spam" }
  | { type: "mute"; messageId: string; userId: string; reason: "spam" }
  | { type: "neg_warn"; userId: string; username: string; strike: 1 | 2 | 3; severity: "low" | "medium" | "high" }
  | { type: "neg_mute"; userId: string; username: string; severity: "low" | "medium" | "high" };

// ── Spam tracking ──────────────────────────────────────────────────────────
const userMessages: Map<string, number[]> = new Map();
const spamWarned: Set<string> = new Set();

// ── Negativity strike tracking ─────────────────────────────────────────────
interface StrikeRecord {
  count: number;
  severity: "low" | "medium" | "high";
  lastStrike: number;
}
const strikeRecords: Map<string, StrikeRecord> = new Map();
const STRIKE_RESET_MS = 30 * 60 * 1000; // reset strikes after 30min of good behavior

// ── Response cooldowns ─────────────────────────────────────────────────────
const lastFired: Map<string, number> = new Map();
const HYPE_COOLDOWN_MS = 45_000; // don't spam hype — one burst per 45 seconds

export async function matchMessage(
  msg: youtube_v3.Schema$LiveChatMessage
): Promise<Action | null> {
  const messageId = msg.id;
  const userId = msg.authorDetails?.channelId;
  const username = msg.authorDetails?.displayName ?? "Chat";
  const text = msg.snippet?.textMessageDetails?.messageText ?? "";

  if (!messageId || !userId) return null;

  // ── Profanity: delete immediately ──────────────────────────────────────
  if (PROFANITY_PATTERNS.some((p) => p.test(text))) {
    return { type: "delete_warn", messageId, userId, reason: "profanity" };
  }

  // ── Spam detection ─────────────────────────────────────────────────────
  const now = Date.now();
  const windowMs = SPAM_CONFIG.windowSeconds * 1000;
  const timestamps = (userMessages.get(userId) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  userMessages.set(userId, timestamps);

  if (timestamps.length > SPAM_CONFIG.maxMessages) {
    if (spamWarned.has(userId)) {
      spamWarned.delete(userId);
      return { type: "mute", messageId, userId, reason: "spam" };
    } else {
      spamWarned.add(userId);
      setTimeout(() => spamWarned.delete(userId), windowMs * 3);
      return { type: "delete_warn", messageId, userId, reason: "spam" };
    }
  }

  // ── AI classification ──────────────────────────────────────────────────
  let result;
  try {
    result = await classifyMessage(text);
  } catch (err: any) {
    console.error("[classify] Error:", err?.message ?? err);
    return null;
  }

  if (!result) return null;

  // Auto-response for stream/shop questions
  if (result.type === "respond" && canFire(result.key)) {
    return { type: "respond", key: result.key };
  }

  // Hype participation — join in with chat
  if (result.type === "hype" && canFireHype()) {
    return { type: "hype" };
  }

  // Negativity / arguing — 3-strike system
  if (result.type === "negative") {
    const record = strikeRecords.get(userId);
    const expired = record && (now - record.lastStrike > STRIKE_RESET_MS);

    if (!record || expired) {
      // First strike
      const newRecord: StrikeRecord = { count: 1, severity: result.severity, lastStrike: now };
      strikeRecords.set(userId, newRecord);
      return { type: "neg_warn", userId, username, strike: 1, severity: result.severity };
    }

    // Escalate severity if this offense is worse than previous
    const severity = higherSeverity(record.severity, result.severity);
    record.severity = severity;
    record.lastStrike = now;
    record.count += 1;

    if (record.count <= 3) {
      return { type: "neg_warn", userId, username, strike: record.count as 1 | 2 | 3, severity };
    }

    // 4th offense → mute (after 3 warnings)
    strikeRecords.delete(userId);
    return { type: "neg_mute", userId, username, severity };
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

function canFireHype(): boolean {
  const last = lastFired.get("__hype__") ?? 0;
  if (Date.now() - last < HYPE_COOLDOWN_MS) return false;
  lastFired.set("__hype__", Date.now());
  return true;
}

function higherSeverity(
  a: "low" | "medium" | "high",
  b: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[a] >= rank[b] ? a : b;
}
