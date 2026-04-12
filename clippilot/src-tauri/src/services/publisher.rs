/// Social media publisher service.
/// OAuth 2.0 flows and upload APIs for TikTok, YouTube Shorts, Twitter/X.
use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OAuthCredentials {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
    pub token_type: String,
}

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

// ── OAuth callback HTTP server ─────────────────────────────────────────────────

/// Start a local HTTP server on a random port and wait for the OAuth callback.
/// Returns (code, state).
pub async fn wait_for_oauth_callback(port: u16) -> anyhow::Result<(String, String)> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener =
        tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    let (mut socket, _) = listener.accept().await?;

    let mut buf = vec![0u8; 8192];
    let n = socket.read(&mut buf).await?;
    let request = String::from_utf8_lossy(&buf[..n]).to_string();

    let (code, state) = parse_oauth_params(&request)?;

    let body = "<html><head><title>ClipPilot</title></head><body style='font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff'><h1 style='color:#00e5ff'>Connected!</h1><p>Return to ClipPilot.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    socket.write_all(response.as_bytes()).await.ok();

    Ok((code, state))
}

fn parse_oauth_params(request: &str) -> anyhow::Result<(String, String)> {
    // GET /callback?code=XXX&state=YYY HTTP/1.1
    let first_line = request.lines().next().unwrap_or("");
    let path_part = first_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("");

    let query = path_part.split('?').nth(1).unwrap_or("");
    let params: HashMap<&str, &str> = query
        .split('&')
        .filter_map(|p| {
            let mut kv = p.splitn(2, '=');
            Some((kv.next()?, kv.next()?))
        })
        .collect();

    let code = params.get("code").map(|s| s.to_string())
        .ok_or_else(|| anyhow::anyhow!("No code in OAuth callback"))?;
    let state = params.get("state").map(|s| s.to_string()).unwrap_or_default();

    Ok((code, state))
}

// ── TikTok ─────────────────────────────────────────────────────────────────────

const TIKTOK_AUTH_URL: &str = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL: &str = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_UPLOAD_INIT_URL: &str =
    "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_STATUS_URL: &str =
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

pub fn tiktok_auth_url(creds: &OAuthCredentials, redirect_uri: &str, state: &str) -> String {
    format!(
        "{}?client_key={}&scope=video.upload,video.publish&response_type=code&redirect_uri={}&state={}",
        TIKTOK_AUTH_URL,
        creds.client_id,
        urlencoded(redirect_uri),
        state
    )
}

pub async fn tiktok_exchange_code(
    creds: &OAuthCredentials,
    code: &str,
    redirect_uri: &str,
) -> anyhow::Result<OAuthTokens> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("client_key", creds.client_id.as_str());
    params.insert("client_secret", creds.client_secret.as_str());
    params.insert("code", code);
    params.insert("grant_type", "authorization_code");
    params.insert("redirect_uri", redirect_uri);

    let resp = client
        .post(TIKTOK_TOKEN_URL)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await?;

    let body: serde_json::Value = resp.json().await?;
    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("TikTok token error: {}", err);
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: body["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(86400),
        token_type: "Bearer".to_string(),
    })
}

pub async fn tiktok_refresh_token(
    creds: &OAuthCredentials,
    refresh_token: &str,
) -> anyhow::Result<OAuthTokens> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("client_key", creds.client_id.as_str());
    params.insert("client_secret", creds.client_secret.as_str());
    params.insert("grant_type", "refresh_token");
    params.insert("refresh_token", refresh_token);

    let resp = client
        .post(TIKTOK_TOKEN_URL)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await?;

    let body: serde_json::Value = resp.json().await?;
    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("TikTok refresh error: {}", err);
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: body["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(86400),
        token_type: "Bearer".to_string(),
    })
}

pub async fn publish_tiktok(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    let client = reqwest::Client::new();
    let file_size = std::fs::metadata(&req.clip_path)?.len();

    let hashtags_str: String = req
        .hashtags
        .iter()
        .map(|h| format!("#{}", h))
        .collect::<Vec<_>>()
        .join(" ");

    let caption = if hashtags_str.is_empty() {
        req.title.clone()
    } else {
        format!("{} {}", req.title, hashtags_str)
    };

    // Step 1: Init upload
    let init_body = serde_json::json!({
        "post_info": {
            "title": caption,
            "privacy_level": "SELF_ONLY",
            "disable_duet": false,
            "disable_comment": false,
            "disable_stitch": false,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1
        }
    });

    let init_resp = client
        .post(TIKTOK_UPLOAD_INIT_URL)
        .bearer_auth(&req.access_token)
        .json(&init_body)
        .send()
        .await?;

    let init_data: serde_json::Value = init_resp.json().await?;
    let upload_url = init_data["data"]["upload_url"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No upload_url in TikTok init response: {:?}", init_data))?
        .to_string();
    let publish_id = init_data["data"]["publish_id"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Step 2: Upload video file
    let video_bytes = tokio::fs::read(&req.clip_path).await?;
    let content_range = format!("bytes 0-{}/{}", file_size - 1, file_size);

    client
        .put(&upload_url)
        .header("Content-Type", "video/mp4")
        .header("Content-Range", content_range)
        .body(video_bytes)
        .send()
        .await?;

    // Step 3: Poll publish status
    for attempt in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        let status_resp = client
            .post(TIKTOK_STATUS_URL)
            .bearer_auth(&req.access_token)
            .json(&serde_json::json!({"publish_id": &publish_id}))
            .send()
            .await?;

        let status_data: serde_json::Value = status_resp.json().await?;
        let status = status_data["data"]["status"].as_str().unwrap_or("");

        match status {
            "PUBLISH_COMPLETE" => {
                let video_id = status_data["data"]["publicaly_available_post_id"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or(&publish_id)
                    .to_string();
                return Ok(PublishResult {
                    post_id: video_id.clone(),
                    post_url: format!("https://www.tiktok.com/@me/video/{}", video_id),
                    platform: "tiktok".to_string(),
                });
            }
            "FAILED" => {
                anyhow::bail!(
                    "TikTok publish failed: {:?}",
                    status_data["data"]["fail_reason"]
                );
            }
            _ => {
                log::info!("TikTok publish status ({}/30): {}", attempt + 1, status);
            }
        }
    }

    anyhow::bail!("TikTok publish timed out after 90 seconds")
}

// ── YouTube Shorts ──────────────────────────────────────────────────────────────

const YOUTUBE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const YOUTUBE_UPLOAD_URL: &str =
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

pub fn youtube_auth_url(creds: &OAuthCredentials, redirect_uri: &str, state: &str) -> String {
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&access_type=offline&prompt=consent",
        YOUTUBE_AUTH_URL,
        creds.client_id,
        urlencoded(redirect_uri),
        urlencoded("https://www.googleapis.com/auth/youtube.upload"),
        state
    )
}

pub async fn youtube_exchange_code(
    creds: &OAuthCredentials,
    code: &str,
    redirect_uri: &str,
) -> anyhow::Result<OAuthTokens> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", creds.client_id.as_str()),
        ("client_secret", creds.client_secret.as_str()),
        ("code", code),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri),
    ];

    let resp = client
        .post(YOUTUBE_TOKEN_URL)
        .form(&params)
        .send()
        .await?;

    let body: serde_json::Value = resp.json().await?;
    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("YouTube token error: {} — {}", err, body["error_description"].as_str().unwrap_or(""));
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: body["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(3600),
        token_type: "Bearer".to_string(),
    })
}

pub async fn youtube_refresh_token(
    creds: &OAuthCredentials,
    refresh_token: &str,
) -> anyhow::Result<OAuthTokens> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", creds.client_id.as_str()),
        ("client_secret", creds.client_secret.as_str()),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];

    let resp = client.post(YOUTUBE_TOKEN_URL).form(&params).send().await?;
    let body: serde_json::Value = resp.json().await?;

    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("YouTube refresh error: {}", err);
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: Some(refresh_token.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(3600),
        token_type: "Bearer".to_string(),
    })
}

pub async fn publish_youtube(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    let client = reqwest::Client::new();
    let file_size = std::fs::metadata(&req.clip_path)?.len();

    let tags: Vec<&str> = req.hashtags.iter().map(|s| s.as_str()).collect();
    let metadata = serde_json::json!({
        "snippet": {
            "title": req.title,
            "description": req.description.as_deref().unwrap_or(""),
            "tags": tags,
            "categoryId": "20"  // Gaming
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": false
        }
    });

    // Step 1: Initiate resumable upload — get upload session URI
    let init_resp = client
        .post(YOUTUBE_UPLOAD_URL)
        .bearer_auth(&req.access_token)
        .header("Content-Type", "application/json")
        .header("X-Upload-Content-Type", "video/mp4")
        .header("X-Upload-Content-Length", file_size.to_string())
        .json(&metadata)
        .send()
        .await?;

    let upload_uri = init_resp
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| anyhow::anyhow!("YouTube did not return upload URI"))?
        .to_string();

    // Step 2: Upload video
    let video_bytes = tokio::fs::read(&req.clip_path).await?;

    let upload_resp = client
        .put(&upload_uri)
        .header("Content-Type", "video/mp4")
        .header("Content-Length", file_size.to_string())
        .body(video_bytes)
        .send()
        .await?;

    let result: serde_json::Value = upload_resp.json().await?;

    if let Some(err) = result["error"]["message"].as_str() {
        anyhow::bail!("YouTube upload error: {}", err);
    }

    let video_id = result["id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("YouTube upload returned no video id"))?
        .to_string();

    Ok(PublishResult {
        post_id: video_id.clone(),
        post_url: format!("https://www.youtube.com/shorts/{}", video_id),
        platform: "youtube_shorts".to_string(),
    })
}

// ── Twitter / X ────────────────────────────────────────────────────────────────

const TWITTER_AUTH_URL: &str = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL: &str = "https://api.twitter.com/2/oauth2/token";
const TWITTER_MEDIA_UPLOAD_URL: &str =
    "https://upload.twitter.com/1.1/media/upload.json";
const TWITTER_TWEET_URL: &str = "https://api.twitter.com/2/tweets";

pub fn twitter_auth_url(
    client_id: &str,
    redirect_uri: &str,
    state: &str,
    code_challenge: &str,
) -> String {
    format!(
        "{}?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}&code_challenge={}&code_challenge_method=S256",
        TWITTER_AUTH_URL,
        client_id,
        urlencoded(redirect_uri),
        urlencoded("tweet.write users.read offline.access media.write"),
        state,
        code_challenge
    )
}

pub fn generate_pkce_pair() -> (String, String) {
    use base64::Engine;
    use sha2::{Digest, Sha256};

    // 32 random bytes → base64url verifier
    let random_bytes: Vec<u8> = (0..32).map(|_| rand::random::<u8>()).collect();
    let verifier =
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes);

    // SHA-256 of verifier → base64url challenge
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let digest = hasher.finalize();
    let challenge =
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest);

    (verifier, challenge)
}

pub async fn twitter_exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
    redirect_uri: &str,
    code_verifier: &str,
) -> anyhow::Result<OAuthTokens> {
    use base64::Engine;
    let client = reqwest::Client::new();

    // Twitter requires HTTP Basic auth for confidential clients
    let credentials = base64::engine::general_purpose::STANDARD
        .encode(format!("{}:{}", client_id, client_secret));

    let params = [
        ("code", code),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri),
        ("code_verifier", code_verifier),
    ];

    let resp = client
        .post(TWITTER_TOKEN_URL)
        .header("Authorization", format!("Basic {}", credentials))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await?;

    let body: serde_json::Value = resp.json().await?;
    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("Twitter token error: {} — {}", err, body["error_description"].as_str().unwrap_or(""));
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: body["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(7200),
        token_type: "Bearer".to_string(),
    })
}

pub async fn twitter_refresh_token(
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> anyhow::Result<OAuthTokens> {
    use base64::Engine;
    let client = reqwest::Client::new();

    let credentials = base64::engine::general_purpose::STANDARD
        .encode(format!("{}:{}", client_id, client_secret));

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];

    let resp = client
        .post(TWITTER_TOKEN_URL)
        .header("Authorization", format!("Basic {}", credentials))
        .form(&params)
        .send()
        .await?;

    let body: serde_json::Value = resp.json().await?;
    if let Some(err) = body["error"].as_str() {
        anyhow::bail!("Twitter refresh error: {}", err);
    }

    Ok(OAuthTokens {
        access_token: body["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        refresh_token: body["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: body["expires_in"].as_u64().unwrap_or(7200),
        token_type: "Bearer".to_string(),
    })
}

pub async fn publish_twitter(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    let client = reqwest::Client::new();
    let video_bytes = tokio::fs::read(&req.clip_path).await?;
    let file_size = video_bytes.len();

    // Step 1: INIT
    let init_params = [
        ("command", "INIT"),
        ("total_bytes", &file_size.to_string()),
        ("media_type", "video/mp4"),
        ("media_category", "tweet_video"),
    ];

    let init_resp = client
        .post(TWITTER_MEDIA_UPLOAD_URL)
        .bearer_auth(&req.access_token)
        .form(&init_params)
        .send()
        .await?;

    let init_data: serde_json::Value = init_resp.json().await?;
    let media_id = init_data["media_id_string"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("Twitter media INIT failed: {:?}", init_data))?
        .to_string();

    // Step 2: APPEND (single chunk — max 5MB per chunk, video can be larger)
    let chunk_size = 4 * 1024 * 1024; // 4 MB chunks
    for (segment_idx, chunk) in video_bytes.chunks(chunk_size).enumerate() {
        use base64::Engine;
        let media_data = base64::engine::general_purpose::STANDARD.encode(chunk);
        let seg_str = segment_idx.to_string();

        let append_params = [
            ("command", "APPEND"),
            ("media_id", &media_id),
            ("segment_index", &seg_str),
            ("media_data", &media_data),
        ];

        client
            .post(TWITTER_MEDIA_UPLOAD_URL)
            .bearer_auth(&req.access_token)
            .form(&append_params)
            .send()
            .await?;
    }

    // Step 3: FINALIZE
    let finalize_params = [("command", "FINALIZE"), ("media_id", &media_id)];
    let finalize_resp = client
        .post(TWITTER_MEDIA_UPLOAD_URL)
        .bearer_auth(&req.access_token)
        .form(&finalize_params)
        .send()
        .await?;

    let finalize_data: serde_json::Value = finalize_resp.json().await?;

    // Step 4: Poll STATUS if processing_info is present
    if finalize_data["processing_info"].is_object() {
        for _ in 0..30 {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

            let status_resp = client
                .get(TWITTER_MEDIA_UPLOAD_URL)
                .bearer_auth(&req.access_token)
                .query(&[("command", "STATUS"), ("media_id", &media_id)])
                .send()
                .await?;

            let status_data: serde_json::Value = status_resp.json().await?;
            let state = status_data["processing_info"]["state"]
                .as_str()
                .unwrap_or("");

            match state {
                "succeeded" => break,
                "failed" => {
                    anyhow::bail!("Twitter media processing failed");
                }
                _ => {}
            }
        }
    }

    // Step 5: Post tweet
    let mut text = req.title.clone();
    if !req.hashtags.is_empty() {
        let tags: String = req
            .hashtags
            .iter()
            .map(|h| format!("#{}", h))
            .collect::<Vec<_>>()
            .join(" ");
        text = format!("{} {}", text, tags);
    }

    let tweet_body = serde_json::json!({
        "text": text,
        "media": {"media_ids": [&media_id]}
    });

    let tweet_resp = client
        .post(TWITTER_TWEET_URL)
        .bearer_auth(&req.access_token)
        .json(&tweet_body)
        .send()
        .await?;

    let tweet_data: serde_json::Value = tweet_resp.json().await?;
    if let Some(err) = tweet_data["errors"].as_array() {
        if !err.is_empty() {
            anyhow::bail!("Twitter tweet error: {:?}", err[0]);
        }
    }

    let tweet_id = tweet_data["data"]["id"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(PublishResult {
        post_id: tweet_id.clone(),
        post_url: format!("https://twitter.com/i/web/status/{}", tweet_id),
        platform: "twitter".to_string(),
    })
}

// ── Dispatch ───────────────────────────────────────────────────────────────────

pub async fn publish(req: &PublishRequest) -> anyhow::Result<PublishResult> {
    match req.platform.as_str() {
        "tiktok" => publish_tiktok(req).await,
        "youtube_shorts" => publish_youtube(req).await,
        "twitter" => publish_twitter(req).await,
        other => anyhow::bail!("Unsupported platform: {}", other),
    }
}

// ── Utility ────────────────────────────────────────────────────────────────────

fn urlencoded(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                c.to_string()
            }
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}
