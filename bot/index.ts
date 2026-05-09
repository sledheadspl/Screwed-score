import "dotenv/config";
import {
  createAuth,
  getLiveChatId,
  fetchMessages,
  postMessage,
  deleteMessage,
  muteUser,
} from "./lib/youtube.js";
import { matchMessage } from "./lib/matcher.js";
import { RESPONSES, HYPE_MESSAGES, negativeWarnMessage, SEVERITY_MUTE } from "./config/responses.js";
import { SPAM_CONFIG } from "./config/triggers.js";

const RECONNECT_DELAY_MS = 10_000;
const DEFAULT_POLL_MS = 5_000;

async function run() {
  const auth = createAuth();
  console.log("[bot] Starting — looking for active live broadcast...");

  let liveChatId: string | null = null;
  while (!liveChatId) {
    liveChatId = await getLiveChatId(auth);
    if (!liveChatId) {
      console.log(`[bot] No active broadcast. Retrying in ${RECONNECT_DELAY_MS / 1000}s...`);
      await sleep(RECONNECT_DELAY_MS);
    }
  }

  console.log(`[bot] Live chat connected: ${liveChatId}`);

  // Consume backlog without acting on it
  let pageToken: string | undefined;
  const init = await fetchMessages(auth, liveChatId);
  pageToken = init.nextPageToken ?? undefined;
  console.log(`[bot] Skipped ${init.items?.length ?? 0} backlog messages. Now live.`);

  while (true) {
    await sleep(DEFAULT_POLL_MS);

    let data;
    try {
      data = await fetchMessages(auth, liveChatId, pageToken);
    } catch (err: any) {
      if (err?.code === 403 || err?.code === 404) {
        console.log("[bot] Broadcast ended. Waiting for next stream...");
        await sleep(RECONNECT_DELAY_MS);
        liveChatId = await getLiveChatId(auth);
        if (!liveChatId) continue;
        pageToken = undefined;
        continue;
      }
      console.error("[bot] Poll error:", err?.message ?? err);
      await sleep(RECONNECT_DELAY_MS);
      continue;
    }

    pageToken = data.nextPageToken ?? undefined;
    const pollMs = data.pollingIntervalMillis ?? DEFAULT_POLL_MS;

    for (const msg of data.items ?? []) {
      const author = msg.authorDetails?.displayName ?? "unknown";
      const text = msg.snippet?.textMessageDetails?.messageText ?? "";
      const action = await matchMessage(msg);
      if (!action) continue;

      try {
        // ── Auto-response (stream/shop question) ──────────────────────────
        if (action.type === "respond") {
          console.log(`[bot] ${action.key} ← "${text}" by ${author}`);
          await postMessage(auth, liveChatId, RESPONSES[action.key]);
        }

        // ── Hype participation ────────────────────────────────────────────
        else if (action.type === "hype") {
          const hypeMsg = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
          console.log(`[bot] Hype ← "${text}" by ${author} → "${hypeMsg}"`);
          await postMessage(auth, liveChatId, hypeMsg);
        }

        // ── Profanity / spam: delete + warn ───────────────────────────────
        else if (action.type === "delete_warn") {
          const warning = action.reason === "profanity"
            ? RESPONSES.LANGUAGE_WARNING
            : RESPONSES.SPAM_WARNING;
          console.log(`[bot] Delete+warn (${action.reason}) ← "${text}" by ${author}`);
          await deleteMessage(auth, action.messageId);
          await postMessage(auth, liveChatId, warning);
        }

        // ── Spam mute (repeat offender) ───────────────────────────────────
        else if (action.type === "mute") {
          console.log(`[bot] Spam mute ← ${author}`);
          await deleteMessage(auth, action.messageId);
          await muteUser(auth, liveChatId, action.userId, SPAM_CONFIG.muteDurationSeconds);
          await postMessage(auth, liveChatId,
            `${author} has been timed out for continued spamming.`
          );
        }

        // ── Negativity warning (strike 1, 2, or 3) ───────────────────────
        else if (action.type === "neg_warn") {
          const warning = negativeWarnMessage(action.username, action.strike);
          console.log(`[bot] Neg warn ${action.strike}/3 (${action.severity}) ← "${text}" by ${author}`);
          await postMessage(auth, liveChatId, warning);
        }

        // ── Negativity mute (after 3 warnings) ───────────────────────────
        else if (action.type === "neg_mute") {
          const duration = SEVERITY_MUTE[action.severity];
          const mins = Math.round(duration / 60);
          console.log(`[bot] Neg mute (${action.severity}, ${duration}s) ← ${author}`);
          await muteUser(auth, liveChatId, action.userId, duration);
          await postMessage(auth, liveChatId,
            `${action.username} has been timed out for ${mins} minute(s) after repeated warnings. Let's keep the vibes positive 🔥`
          );
        }
      } catch (err: any) {
        console.error(`[bot] Action failed (${action.type}):`, err?.message ?? err);
      }
    }

    if (pollMs > DEFAULT_POLL_MS) {
      await sleep(pollMs - DEFAULT_POLL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch((err) => {
  console.error("[bot] Fatal:", err);
  process.exit(1);
});
