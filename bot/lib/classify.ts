import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Descriptions used in the Claude prompt — keep these accurate to the actual responses
const RESPONSE_KEYS = `
F2  - Do you ship worldwide / international shipping questions
F3  - Price of a specific card (tell them to check Collectr or TCGPlayer)
F4  - Price of packs or orders (send to website)
F6  - How does this work / how does the stream work / new viewer asking for an explanation
F7  - How long does shipping take / when will I receive my order / delivery time
F10 - How do I place an order / how do I buy / how do I get packs
F11 - Queue questions / when will my order be opened / where is my order
F12 - Complaining the price is too high / saying it's expensive / found it cheaper
F13 - Where do they get their packs / how do they source their products
F14 - Problem with an order / need to contact support / wrong or damaged order
F15 - Asking about free packs, free cards, or giveaways on stream
`;

const SYSTEM = `You moderate YouTube live chat for a Pokémon card pack opening stream. The streamer is Sled. The shop is poke-bank.com — customers order packs online, get placed in a live queue, and their orders are opened on stream then shipped.

Decide if a chat message is a genuine question about the stream or shop that deserves an auto-response. Return ONLY the matching key from the list below, or "none".

${RESPONSE_KEYS}

Rules:
- Return a key only for real questions about the shop/stream/shipping/ordering
- Return "none" for: hype, emojis, greetings, jokes, off-topic chat, conversations between viewers, or anything that isn't a question
- If multiple keys could apply, pick the most specific one
- Return exactly one token: the key (e.g. F10) or the word none`;

// Quick pre-filter: only classify if the message looks like it could be a question.
// Saves API calls for obvious non-questions (hype, emojis, short reactions).
const QUESTION_HINTS = [
  "?", "how", "what", "when", "where", "why", "do you", "can you",
  "is there", "will ", "does ", "ship", "order", "price", "cost",
  "queue", "free", "work", "receive", "deliver", "support", "issue",
];

function looksLikeQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return QUESTION_HINTS.some((hint) => lower.includes(hint));
}

export async function classifyMessage(text: string): Promise<string | null> {
  if (text.trim().length < 8) return null;
  if (!looksLikeQuestion(text)) return null;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });

  const raw =
    response.content[0].type === "text"
      ? response.content[0].text.trim().toUpperCase()
      : null;

  if (!raw || raw === "NONE") return null;
  // Validate format: F followed by 1-2 digits
  return /^F\d{1,2}$/.test(raw) ? raw : null;
}
