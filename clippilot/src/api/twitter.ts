/**
 * Twitter/X API v2 client.
 * Full implementation in Phase 6.
 */

export interface TwitterTweetRequest {
  text: string;
  access_token: string;
  video_path: string;
}

export interface TwitterTweetResponse {
  tweet_id: string;
  url: string;
}

export async function uploadToTwitter(_req: TwitterTweetRequest): Promise<TwitterTweetResponse> {
  // Phase 6: Twitter API v2
  // 1. POST /2/media/upload (chunked INIT/APPEND/FINALIZE)
  // 2. POST /2/tweets — attach media_id
  throw new Error("Twitter publishing not implemented yet — Phase 6");
}
