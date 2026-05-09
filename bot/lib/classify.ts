import Anthropic from "@anthropic-ai/sdk";
import type { ResponseKey } from "../config/responses.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You moderate YouTube live chat for a Pokémon card pack opening stream. The streamer is Sled. The shop is poke-bank.com — customers order packs online, get placed in a live queue, and their orders are opened on stream then shipped.

Decide if a chat message is a question about the stream or shop that deserves an auto-response. Return ONLY one of the exact keys below, or the word "none".

SHIPS_WORLDWIDE   - asking if you ship internationally or to their country
CARD_PRICE        - asking the price/value of a specific card (tell them to use Collectr or TCGPlayer)
PACK_PRICE        - asking how much packs or orders cost
HOW_IT_WORKS      - new viewer asking how the stream/shop works, or what this is
SHIPPING_TIME     - asking how long shipping takes or when they'll receive their order
HOW_TO_ORDER      - asking how to place an order or how to buy
QUEUE_INFO        - asking about the queue, when their order will be opened, or order status
PRICE_DEFENSE     - complaining the price is too high or saying they found it cheaper
PACK_SOURCE       - asking where the packs come from or how the shop sources its products
SUPPORT           - reporting a problem with an order, wrong/damaged cards, or how to contact support
NO_FREE_PACKS     - asking about free packs, free cards, or giveaways on stream

Rules:
- Only return a key for genuine questions about the shop or stream
- Return "none" for hype, emojis, greetings, jokes, off-topic chat, or viewer conversations
- Return exactly one token — the key or the word none`;

// Pre-filter: only classify messages that look like they could be questions.
// Avoids API calls for obvious non-questions (short reactions, pure hype, emojis).
const QUESTION_HINTS = [
  "?", "how", "what", "when", "where", "why", "do you", "can you",
  "is there", "will ", "does ", "ship", "order", "price", "cost",
  "queue", "free", "work", "receive", "deliver", "support", "issue",
  "source", "get your", "buy", "purchase",
];

function looksLikeQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return QUESTION_HINTS.some((hint) => lower.includes(hint));
}

const VALID_KEYS = new Set<ResponseKey>([
  "SHIPS_WORLDWIDE", "CARD_PRICE", "PACK_PRICE", "HOW_IT_WORKS",
  "SHIPPING_TIME", "HOW_TO_ORDER", "QUEUE_INFO", "PRICE_DEFENSE",
  "PACK_SOURCE", "SUPPORT", "NO_FREE_PACKS",
]);

export async function classifyMessage(text: string): Promise<ResponseKey | null> {
  if (text.trim().length < 8) return null;
  if (!looksLikeQuestion(text)) return null;

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
  return VALID_KEYS.has(raw as ResponseKey) ? (raw as ResponseKey) : null;
}
