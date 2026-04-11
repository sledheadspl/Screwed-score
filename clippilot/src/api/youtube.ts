/**
 * YouTube Data API v3 client.
 * Full implementation in Phase 6.
 */

export interface YouTubeUploadRequest {
  title: string;
  description?: string;
  tags?: string[];
  access_token: string;
  video_path: string;
  made_for_kids?: boolean;
}

export interface YouTubeUploadResponse {
  video_id: string;
  url: string;
}

export async function uploadToYouTube(_req: YouTubeUploadRequest): Promise<YouTubeUploadResponse> {
  // Phase 6: YouTube Data API v3 resumable upload
  // POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
  throw new Error("YouTube publishing not implemented yet — Phase 6");
}

export async function refreshYouTubeToken(_refreshToken: string): Promise<{ access_token: string }> {
  throw new Error("YouTube token refresh not implemented yet — Phase 6");
}
