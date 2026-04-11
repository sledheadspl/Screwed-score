/**
 * Input validation utilities.
 * Pure functions — no side effects.
 */

/** Validate a license key format */
export function isValidLicenseKey(key: string): boolean {
  return /^CLIP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
}

/** Validate a stream URL */
export function isValidStreamUrl(url: string): {
  valid: boolean;
  platform: string | null;
  error: string | null;
} {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("twitch.tv")) return { valid: true, platform: "twitch", error: null };
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return { valid: true, platform: "youtube", error: null };
    if (host.includes("kick.com")) return { valid: true, platform: "kick", error: null };

    return {
      valid: false,
      platform: null,
      error: "Unsupported platform. Supported: Twitch, YouTube, Kick",
    };
  } catch {
    return { valid: false, platform: null, error: "Invalid URL format" };
  }
}

/** Validate clip title length */
export function validateClipTitle(title: string): string | null {
  if (!title.trim()) return "Title is required";
  if (title.length > 150) return "Title must be 150 characters or less";
  return null;
}

/** Validate hashtag format */
export function validateHashtag(tag: string): boolean {
  return /^[a-zA-Z0-9_]{1,100}$/.test(tag.replace(/^#/, ""));
}

/** Parse hashtag string into array */
export function parseHashtags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter((t) => t.length > 0 && validateHashtag(t));
}

/** Validate detection sensitivity (20–100) */
export function validateSensitivity(value: number): boolean {
  return value >= 20 && value <= 100;
}

/** Validate OAuth access token (non-empty, reasonable length) */
export function validateAccessToken(token: string): boolean {
  return token.trim().length >= 10 && token.trim().length <= 2048;
}
