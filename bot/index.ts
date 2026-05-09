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
import { RESPONSES } from "./config/responses.js";
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

      if (action.type === "respond") {
        const response = RESPONSES[action.key];
        if (!response) continue;
        console.log(`[bot] Auto-respond ${action.key} triggered by ${author}: "${text}"`);
        try {
          await postMessage(auth, liveChatId, response);
        } catch (err: any) {
          console.error(`[bot] Failed to post ${action.key}:`, err?.message ?? err);
        }
      }

      if (action.type === "delete_warn") {
        const warning =
          action.reason === "profanity" ? RESPONSES.LANGUAGE_WARNING : RESPONSES.SPAM_WARNING;
        console.log(`[bot] ${action.reason} from ${author} — deleting + warning`);
        try {
          await deleteMessage(auth, action.messageId);
          await postMessage(auth, liveChatId, warning);
        } catch (err: any) {
          console.error(`[bot] delete_warn failed:`, err?.message ?? err);
        }
      }

      if (action.type === "mute") {
        console.log(`[bot] Spam repeat from ${author} — muting for ${SPAM_CONFIG.muteDurationSeconds}s`);
        try {
          await deleteMessage(auth, action.messageId);
          await muteUser(auth, liveChatId, action.userId, SPAM_CONFIG.muteDurationSeconds);
          await postMessage(
            auth,
            liveChatId,
            `${author} has been temporarily muted for continued spamming.`
          );
        } catch (err: any) {
          console.error(`[bot] mute failed:`, err?.message ?? err);
        }
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
