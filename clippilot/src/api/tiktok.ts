/**
 * TikTok Content Posting API v2 client.
 * Full implementation in Phase 6. Stubs provided for type safety.
 */

export interface TikTokUploadResponse {
  post_id: string;
  share_url: string;
}

export interface TikTokVideoUpload {
  title: string;
  description?: string;
  privacy_level?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
  access_token: string;
  video_path: string;
}

export async function uploadToTikTok(_req: TikTokVideoUpload): Promise<TikTokUploadResponse> {
  // Phase 6: TikTok Content Posting API v2
  // Steps:
  // 1. POST /v2/post/publish/video/init/ — get upload_url
  // 2. PUT upload_url — chunked video upload
  // 3. POST /v2/post/publish/status/fetch/ — poll for completion
  throw new Error("TikTok publishing not implemented yet — Phase 6");
}

export async function refreshTikTokToken(_refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  throw new Error("TikTok token refresh not implemented yet — Phase 6");
}
