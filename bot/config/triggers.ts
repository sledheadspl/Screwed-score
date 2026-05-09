// Spam detection config
export const SPAM_CONFIG = {
  maxMessages: 10,       // messages within the window before triggering
  windowSeconds: 10,     // sliding window size
  muteDurationSeconds: 86000, // ~24h mute on repeat offense
};

// Per-key cooldown (seconds) — prevents the same auto-response from firing too often
export const RESPONSE_COOLDOWNS: Record<string, number> = {
  F2: 120,
  F3: 120,
  F4: 120,
  F6: 180,
  F7: 120,
  F10: 180,
  F11: 120,
  F12: 180,
  F13: 180,
  F14: 120,
  F15: 180,
};

// Profanity list — any match → delete message + warn with F5
// Add words in lowercase; partial-word matching is used
export const PROFANITY: string[] = [
  // Add your blocked words here, e.g.:
  // "badword1",
  // "badword2",
];
