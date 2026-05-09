import Anthropic from "@anthropic-ai/sdk";
import type { ResponseKey } from "../config/responses.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// What the classifier can return
export type ClassifyResult =
  | { type: "respond"; key: ResponseKey }
  | { type: "negative"; severity: "low" | "medium" | "high" }
  | { type: "hype" }
  | null;

const SYSTEM = `You moderate YouTube live chat for a Pokémon card pack opening stream. The streamer is Sled. The shop is poke-bank.com — customers order packs online, get placed in a live queue, and orders are opened on stream then shipped.

Your goal is to keep chat positive, hype, and welcoming. Classify each message and return ONLY one token.

── AUTO-RESPONSE KEYS (viewer asking a genuine question) ──
SHIPS_WORLDWIDE   - asking if you ship internationally or to their country
CARD_PRICE        - asking the price/value of a specific card
PACK_PRICE        - asking how much packs or orders cost
HOW_IT_WORKS      - new viewer asking how the stream/shop works
SHIPPING_TIME     - asking how long shipping takes or when they'll receive their order
HOW_TO_ORDER      - asking how to place an order or how to buy
QUEUE_INFO        - asking about the queue, when their order opens, or order status
PRICE_DEFENSE     - complaining the price is too high or saying they found it cheaper
PACK_SOURCE       - asking where the packs come from or how the shop sources products
SUPPORT           - reporting a problem with an order or asking how to contact support
NO_FREE_PACKS     - asking about free packs, free cards, or giveaways on stream

── NEGATIVITY LEVELS (bad for the vibe — needs a warning) ──
NEG_LOW    - mild negativity: vague complaining, saying something is bad, being a downer, minor passive-aggressive comments
NEG_MEDIUM - arguing with another viewer, heated back-and-forth, directed put-downs, sustained negativity toward the stream
NEG_HIGH   - bullying, targeted harassment, personal attacks on another viewer or the streamer, threats

── HYPE (chat celebrating a good pull or exciting moment) ──
HYPE - chat is going wild: GGs, W, WWW, "lets go", fire emojis, celebrating a rare card or big pull

── RETURN "none" FOR ──
- Neutral chat, greetings, casual conversation
- Off-topic but harmless comments
- Single emojis or very short reactions that don't fit above

Return exactly one token. No punctuation, no explanation.`;

// Pre-filter before hitting the API — skip obvious non-actionable messages
const ACTION_HINTS = [
  "?", "how", "what", "when", "where", "why", "do you", "can you",
  "is there", "will ", "does ", "ship", "order", "price", "cost",
  "queue", "free", "work", "receive", "deliver", "support", "issue",
  "source", "get your", "buy", "purchase",
  // negativity signals
  "scam", "scalper", "fake", "lie", "wrong", "bad", "hate",
  "stupid", "dumb", "worst", "overpr", "rip off", "ripoff",
  "shut up", "stfu", "idiot", "boring", "waste", "pathetic",
  "argument", "fighting", "stop", "you're", "youre",
  // hype signals
  "gg", "ww", "lets go", "letsgo", "fire", "rare", "pull",
  "pogchamp", "pog", "hype", "omg", "holy", "insane", "crazy",
];

function worthClassifying(text: string): boolean {
  if (text.trim().length < 3) return false;
  const lower = text.toLowerCase();
  return ACTION_HINTS.some((hint) => lower.includes(hint));
}

const VALID_RESPOND_KEYS = new Set<ResponseKey>([
  "SHIPS_WORLDWIDE", "CARD_PRICE", "PACK_PRICE", "HOW_IT_WORKS",
  "SHIPPING_TIME", "HOW_TO_ORDER", "QUEUE_INFO", "PRICE_DEFENSE",
  "PACK_SOURCE", "SUPPORT", "NO_FREE_PACKS",
]);

export async function classifyMessage(text: string): Promise<ClassifyResult> {
  if (!worthClassifying(text)) return null;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 15,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });

  const raw =
    response.content[0].type === "text"
      ? response.content[0].text.trim().toUpperCase()
      : null;

  if (!raw || raw === "NONE") return null;

  if (raw === "NEG_LOW")    return { type: "negative", severity: "low" };
  if (raw === "NEG_MEDIUM") return { type: "negative", severity: "medium" };
  if (raw === "NEG_HIGH")   return { type: "negative", severity: "high" };
  if (raw === "HYPE")       return { type: "hype" };

  if (VALID_RESPOND_KEYS.has(raw as ResponseKey)) {
    return { type: "respond", key: raw as ResponseKey };
  }

  return null;
}
