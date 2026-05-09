import Anthropic from "@anthropic-ai/sdk";
import type { ResponseKey } from "../config/responses.js";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StreamerAction =
  | { type: "post_response"; key: ResponseKey }
  | { type: "post_hype" }
  | { type: "post_custom"; message: string }
  | null;

const SYSTEM = `You are a mod bot assistant. The streamer Sled is typing in their own live chat. Determine if Sled is giving YOU (the bot) an instruction, then return exactly one of the following:

── If Sled is telling you to post a canned response ──
Return the matching key:
SHIPS_WORLDWIDE, CARD_PRICE, PACK_PRICE, HOW_IT_WORKS, SHIPPING_TIME,
HOW_TO_ORDER, QUEUE_INFO, PRICE_DEFENSE, PACK_SOURCE, SUPPORT, NO_FREE_PACKS, CLOVERS

── If Sled wants you to hype chat up ──
Return: HYPE

── If Sled wants you to post a custom message ──
Return: CUSTOM: <the exact message to post, keeping Sled's wording>

── If this is normal streamer chat (not a bot instruction) ──
Return: none

Examples:
  "post the clovers"             → CLOVERS
  "let chat know how to order"   → HOW_TO_ORDER
  "hype it up chat"              → HYPE
  "tell chat good luck everyone" → CUSTOM: Good luck everyone! 🔥
  "nice pull bro"                → none
  "thanks for watching"          → none

Return only the key, HYPE, CUSTOM: <msg>, or none. No extra words.`;

const VALID_RESPONSE_KEYS = new Set<ResponseKey>([
  "SHIPS_WORLDWIDE", "CARD_PRICE", "PACK_PRICE", "HOW_IT_WORKS",
  "SHIPPING_TIME", "HOW_TO_ORDER", "QUEUE_INFO", "PRICE_DEFENSE",
  "PACK_SOURCE", "SUPPORT", "NO_FREE_PACKS", "CLOVERS",
]);

export async function interpretStreamerMessage(text: string): Promise<StreamerAction> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });

  const raw =
    response.content[0].type === "text"
      ? response.content[0].text.trim()
      : null;

  if (!raw || raw.toUpperCase() === "NONE") return null;

  if (raw.toUpperCase() === "HYPE") return { type: "post_hype" };

  if (raw.toUpperCase().startsWith("CUSTOM:")) {
    const message = raw.slice("CUSTOM:".length).trim();
    return message ? { type: "post_custom", message } : null;
  }

  const upper = raw.toUpperCase() as ResponseKey;
  if (VALID_RESPONSE_KEYS.has(upper)) {
    return { type: "post_response", key: upper };
  }

  return null;
}

// Append every streamer message to a local log file for reference
const LOG_PATH = path.join(process.cwd(), "streamer.log");

export function logStreamerMessage(text: string, action: StreamerAction): void {
  const timestamp = new Date().toISOString();
  const actionStr = action
    ? action.type === "post_response"
      ? `→ posted ${action.key}`
      : action.type === "post_hype"
      ? "→ posted hype"
      : `→ posted custom: "${action.message}"`
    : "→ no action";

  const line = `[${timestamp}] ${text}  ${actionStr}\n`;

  try {
    fs.appendFileSync(LOG_PATH, line, "utf-8");
  } catch {
    // Non-fatal — log to console if file write fails
    console.warn("[log] Could not write to streamer.log:", line.trim());
  }
}
