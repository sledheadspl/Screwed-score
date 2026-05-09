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

// Profanity patterns — message is deleted immediately + LANGUAGE_WARNING is posted.
//
// Each pattern uses word-boundary matching so short roots don't fire on unrelated words
// (e.g. "ass" won't match "class", "mass", "pass").
// Prefix patterns like /\bfuck/i intentionally catch derivatives (fucking, fucker, etc.).
export const PROFANITY_PATTERNS: RegExp[] = [
  // Curse words
  /\bfuck/i,       // fuck, fucking, fucker, fucked
  /\bshit/i,       // shit, shitty, bullshit
  /\bbitch/i,
  /\bcunt/i,
  /\bpussy/i,
  /\bcock\b/i,
  /\bdick\b/i,     // exact — avoids "dictionary", "Dickens"
  /\bass\b/i,      // exact "ass" on its own
  /\basshole/i,    // asshole, assholes
  /\bjackass/i,
  /\bbastard/i,
  /\bwhore/i,
  /\bslut/i,
  /\bpiss/i,
  /\bdamn\b/i,

  // Slurs
  /\bfaggot/i,
  /\bfag\b/i,
  /\bretard/i,
  /\bnigger/i,
  /\bnigga/i,
  /\bgay\b/i,      // used as an insult in stream chat

  // Business attacks
  /\bscam/i,       // scam, scammer, scamming
  /\bscalper/i,    // scalper, scalpers, scalping
];
