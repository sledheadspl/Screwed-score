// Auto-respond triggers: any viewer message containing these keywords fires the response
export interface AutoTrigger {
  key: string;
  keywords: string[];
  cooldownSeconds: number;
}

export const AUTO_TRIGGERS: AutoTrigger[] = [
  {
    key: "F2",
    keywords: [
      "ship worldwide", "international shipping", "do you ship to",
      "ship to", "shipping to", "ship overseas", "outside the us",
      "outside us", "ship internationally", "worldwide shipping",
      "do you ship international", "can you ship",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F3",
    keywords: [
      "price of a card", "card price", "how much is the card",
      "how much are the cards", "card worth", "cards worth", "card value",
      "price check", "how much for a card", "what are the cards worth",
      "collectr", "tcgplayer", "tcg price",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F4",
    keywords: [
      "pack price", "how much are packs", "price of packs",
      "how much per pack", "cost of packs", "how much is the order",
      "how much do packs cost", "pack cost", "order cost",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F6",
    keywords: [
      "how does this work", "how does it work", "how do you do this",
      "how does the stream work", "how does the shop work",
      "i'm new", "im new", "new here", "first time here", "just joined",
      "confused", "what is this", "how does this shop", "explain how",
      "how does buying work",
    ],
    cooldownSeconds: 180,
  },
  {
    key: "F7",
    keywords: [
      "how long does shipping", "how long for shipping", "shipping time",
      "delivery time", "how many days", "when will i get",
      "when will it arrive", "when will i receive", "how long to receive",
      "how long until i get", "when does it ship", "estimated delivery",
      "how long delivery",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F10",
    keywords: [
      "how do i order", "how to order", "how do i buy", "how to buy",
      "how to place an order", "how do i place", "where do i order",
      "how to purchase", "how do i get packs", "where to buy",
      "how can i order", "where can i buy", "how do i get cards",
    ],
    cooldownSeconds: 180,
  },
  {
    key: "F11",
    keywords: [
      "how long is the queue", "queue time", "how long is queue",
      "when is my order", "how long until my order", "am i in the queue",
      "am i in queue", "when will mine", "when is mine",
      "when do i get", "my order status", "where is my order",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F12",
    keywords: [
      "too expensive", "overpriced", "cheaper elsewhere", "cheaper somewhere",
      "found it cheaper", "better price elsewhere", "price is too high",
      "lower the price", "too much money", "can you lower",
      "that's too much", "thats too much",
    ],
    cooldownSeconds: 180,
  },
  {
    key: "F13",
    keywords: [
      "where do you get your packs", "how do you get your packs",
      "where are packs from", "how do you source",
      "where do packs come from", "where do you buy your packs",
      "how do you get packs", "from a distributor", "where do you purchase",
    ],
    cooldownSeconds: 180,
  },
  {
    key: "F14",
    keywords: [
      "problem with my order", "issue with my order", "wrong order",
      "missing cards", "damaged cards", "how do i contact", "how to contact",
      "support email", "customer service", "need help with my order",
      "help with order",
    ],
    cooldownSeconds: 120,
  },
  {
    key: "F15",
    keywords: [
      "free packs", "free pack", "can i get free", "give me free",
      "free cards", "get free packs", "how to get free",
      "giveaway here", "free giveaway",
    ],
    cooldownSeconds: 180,
  },
];

// Spam detection config
export const SPAM_CONFIG = {
  maxMessages: 10,    // message count threshold
  windowSeconds: 10,  // within this many seconds
  muteDurationSeconds: 86000, // ~24 hours
};

// Profanity list — any match → delete + warn with F5
// Add words in lowercase; partial-word matching is used
export const PROFANITY: string[] = [
  // Populate with your blocked words here
  // e.g. "badword1", "badword2"
];
