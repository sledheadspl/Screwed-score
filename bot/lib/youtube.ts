import { google, youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export function createAuth(): OAuth2Client {
  const auth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return auth;
}

export async function getLiveChatId(auth: OAuth2Client): Promise<string | null> {
  const yt = google.youtube({ version: "v3", auth });
  const res = await yt.liveBroadcasts.list({
    part: ["snippet"],
    broadcastStatus: "active",
    broadcastType: "all",
  });
  const items = res.data.items;
  if (!items || items.length === 0) return null;
  return items[0].snippet?.liveChatId ?? null;
}

export async function fetchMessages(
  auth: OAuth2Client,
  liveChatId: string,
  pageToken?: string
): Promise<youtube_v3.Schema$LiveChatMessageListResponse> {
  const yt = google.youtube({ version: "v3", auth });
  const res = await yt.liveChatMessages.list({
    liveChatId,
    part: ["snippet", "authorDetails"],
    pageToken,
  });
  return res.data;
}

export async function postMessage(
  auth: OAuth2Client,
  liveChatId: string,
  text: string
): Promise<void> {
  const yt = google.youtube({ version: "v3", auth });
  await yt.liveChatMessages.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        liveChatId,
        type: "textMessageEvent",
        textMessageDetails: { messageText: text },
      },
    },
  });
}

export async function deleteMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<void> {
  const yt = google.youtube({ version: "v3", auth });
  await yt.liveChatMessages.delete({ id: messageId });
}

export async function muteUser(
  auth: OAuth2Client,
  liveChatId: string,
  userId: string,
  durationSeconds: number
): Promise<void> {
  const yt = google.youtube({ version: "v3", auth });
  await yt.liveChatBans.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        liveChatId,
        type: "temporary",
        bannedUserDetails: { channelId: userId },
        banDurationSeconds: durationSeconds,
      },
    },
  });
}
