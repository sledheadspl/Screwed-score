import type { ResponseKey } from "./responses.js";

// Spam detection config
export const SPAM_CONFIG = {
  maxMessages: 10,            // message count threshold
  windowSeconds: 10,          // sliding window
  muteDurationSeconds: 86000, // ~24h mute on repeat offense
};

// Per-key cooldown (seconds) — prevents the same response from firing too often
export const RESPONSE_COOLDOWNS: Record<ResponseKey, number> = {
  SPAM_WARNING:     60,
  LANGUAGE_WARNING: 30,
  SHIPS_WORLDWIDE:  120,
  CARD_PRICE:       120,
  PACK_PRICE:       120,
  HOW_IT_WORKS:     180,
  SHIPPING_TIME:    120,
  HOW_TO_ORDER:     180,
  QUEUE_INFO:       120,
  PRICE_DEFENSE:    180,
  PACK_SOURCE:      180,
  SUPPORT:          120,
  NO_FREE_PACKS:    180,
  PERSONAL_INFO:    30,
  CLOVERS:          30,
};

// Profanity list — any match → delete message + warn with LANGUAGE_WARNING
// Add words in lowercase; partial-word matching is used
export const PROFANITY: string[] = [
  // Add your blocked words here
];
