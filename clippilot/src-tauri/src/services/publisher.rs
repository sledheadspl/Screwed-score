/// Social media publisher service.
/// OAuth token management and upload logic for TikTok, YouTube, Twitter.

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PublishRequest {
    pub platform: String,
    pub clip_path: String,
    pub title: String,
    pub description: Option<String>,
    pub hashtags: Vec<String>,
    pub access_token: String,
}

#[derive(Debug, serde::Serialize)]
pub struct PublishResult {
    pub post_id: String,
    pub post_url: String,
    pub platform: String,
}

/// Publish clip to the specified platform (stub — full implementation in Phase 6).
pub async fn publish(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    match req.platform.as_str() {
        "tiktok" => publish_tiktok(req).await,
        "youtube_shorts" => publish_youtube(req).await,
        "twitter" => publish_twitter(req).await,
        other => anyhow::bail!("Unsupported platform: {}", other),
    }
}

async fn publish_tiktok(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    // TikTok Content Posting API v2
    // Full implementation in Phase 6
    log::info!("Publishing to TikTok: {}", req.title);
    anyhow::bail!("TikTok publishing not yet implemented — Phase 6")
}

async fn publish_youtube(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    // YouTube Data API v3 — resumable upload
    log::info!("Publishing to YouTube Shorts: {}", req.title);
    anyhow::bail!("YouTube publishing not yet implemented — Phase 6")
}

async fn publish_twitter(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    // Twitter API v2 — media upload + tweet
    log::info!("Publishing to Twitter/X: {}", req.title);
    anyhow::bail!("Twitter publishing not yet implemented — Phase 6")
}
