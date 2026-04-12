use crate::services::publisher::{self, OAuthCredentials, PublishRequest};
use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct Platform {
    pub id: String,
    pub name: String,
    pub supported: bool,
    pub max_duration_seconds: u32,
    pub max_file_size_mb: u32,
    pub aspect_ratio: String,
}

#[tauri::command]
pub async fn get_supported_platforms() -> Result<Vec<Platform>, String> {
    Ok(vec![
        Platform {
            id: "tiktok".to_string(),
            name: "TikTok".to_string(),
            supported: true,
            max_duration_seconds: 600,
            max_file_size_mb: 287,
            aspect_ratio: "9:16".to_string(),
        },
        Platform {
            id: "youtube_shorts".to_string(),
            name: "YouTube Shorts".to_string(),
            supported: true,
            max_duration_seconds: 60,
            max_file_size_mb: 256,
            aspect_ratio: "9:16".to_string(),
        },
        Platform {
            id: "twitter".to_string(),
            name: "Twitter/X".to_string(),
            supported: true,
            max_duration_seconds: 140,
            max_file_size_mb: 512,
            aspect_ratio: "9:16".to_string(),
        },
    ])
}

#[derive(serde::Deserialize)]
pub struct PublishConfig {
    pub platform: String,
    pub title: String,
    pub description: Option<String>,
    pub hashtags: Option<Vec<String>>,
    pub clip_path: String,
}

#[tauri::command]
pub async fn validate_publish_config(config: PublishConfig) -> Result<bool, String> {
    if config.title.is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    if config.title.len() > 150 {
        return Err("Title too long (max 150 chars)".to_string());
    }
    if config.clip_path.is_empty() {
        return Err("Clip path is required".to_string());
    }
    let path = std::path::PathBuf::from(&config.clip_path);
    if !path.exists() {
        return Err(format!("Clip file not found: {}", config.clip_path));
    }
    Ok(true)
}

// ── OAuth flows ───────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct StartOAuthPayload {
    pub platform: String,
    pub client_id: String,
    pub client_secret: String,
}

#[derive(serde::Serialize)]
pub struct OAuthResult {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
    /// The PKCE verifier if needed for later token exchanges (Twitter)
    pub code_verifier: Option<String>,
}

/// Opens the platform's OAuth page and waits for the callback.
/// Returns tokens on success. The frontend should persist them.
#[tauri::command]
pub async fn start_oauth_flow(
    payload: StartOAuthPayload,
    app: AppHandle,
) -> Result<OAuthResult, String> {
    // Pick a random available port in 40000-49999
    let port: u16 = 40000 + (rand::random::<u16>() % 10000);
    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);
    let state: String = (0..16)
        .map(|_| format!("{:x}", rand::random::<u8>()))
        .collect();

    let creds = OAuthCredentials {
        client_id: payload.client_id.clone(),
        client_secret: payload.client_secret.clone(),
    };

    match payload.platform.as_str() {
        "tiktok" => {
            let auth_url = publisher::tiktok_auth_url(&creds, &redirect_uri, &state);
            open_browser(&app, &auth_url)?;

            let (code, _) = publisher::wait_for_oauth_callback(port)
                .await
                .map_err(|e| e.to_string())?;

            let tokens = publisher::tiktok_exchange_code(&creds, &code, &redirect_uri)
                .await
                .map_err(|e| e.to_string())?;

            Ok(OAuthResult {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                code_verifier: None,
            })
        }

        "youtube_shorts" => {
            let auth_url = publisher::youtube_auth_url(&creds, &redirect_uri, &state);
            open_browser(&app, &auth_url)?;

            let (code, _) = publisher::wait_for_oauth_callback(port)
                .await
                .map_err(|e| e.to_string())?;

            let tokens = publisher::youtube_exchange_code(&creds, &code, &redirect_uri)
                .await
                .map_err(|e| e.to_string())?;

            Ok(OAuthResult {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                code_verifier: None,
            })
        }

        "twitter" => {
            let (verifier, challenge) = publisher::generate_pkce_pair();
            let auth_url = publisher::twitter_auth_url(
                &payload.client_id,
                &redirect_uri,
                &state,
                &challenge,
            );
            open_browser(&app, &auth_url)?;

            let (code, _) = publisher::wait_for_oauth_callback(port)
                .await
                .map_err(|e| e.to_string())?;

            let tokens = publisher::twitter_exchange_code(
                &payload.client_id,
                &payload.client_secret,
                &code,
                &redirect_uri,
                &verifier,
            )
            .await
            .map_err(|e| e.to_string())?;

            Ok(OAuthResult {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                code_verifier: Some(verifier),
            })
        }

        p => Err(format!("Unknown platform: {}", p)),
    }
}

#[derive(serde::Deserialize)]
pub struct RefreshTokenPayload {
    pub platform: String,
    pub client_id: String,
    pub client_secret: String,
    pub refresh_token: String,
}

/// Refresh an expired access token.
#[tauri::command]
pub async fn refresh_oauth_token(
    payload: RefreshTokenPayload,
) -> Result<OAuthResult, String> {
    let creds = OAuthCredentials {
        client_id: payload.client_id.clone(),
        client_secret: payload.client_secret.clone(),
    };

    let tokens = match payload.platform.as_str() {
        "tiktok" => publisher::tiktok_refresh_token(&creds, &payload.refresh_token)
            .await
            .map_err(|e| e.to_string())?,
        "youtube_shorts" => {
            publisher::youtube_refresh_token(&creds, &payload.refresh_token)
                .await
                .map_err(|e| e.to_string())?
        }
        "twitter" => publisher::twitter_refresh_token(
            &payload.client_id,
            &payload.client_secret,
            &payload.refresh_token,
        )
        .await
        .map_err(|e| e.to_string())?,
        p => return Err(format!("Unknown platform: {}", p)),
    };

    Ok(OAuthResult {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        code_verifier: None,
    })
}

#[derive(serde::Deserialize)]
pub struct PublishClipPayload {
    pub platform: String,
    pub clip_path: String,
    pub title: String,
    pub description: Option<String>,
    pub hashtags: Vec<String>,
    pub access_token: String,
}

/// Publish a processed clip to a social platform.
#[tauri::command]
pub async fn publish_clip(
    payload: PublishClipPayload,
) -> Result<serde_json::Value, String> {
    let req = PublishRequest {
        platform: payload.platform,
        clip_path: payload.clip_path,
        title: payload.title,
        description: payload.description,
        hashtags: payload.hashtags,
        access_token: payload.access_token,
    };

    let result = publisher::publish(&req)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "post_id": result.post_id,
        "post_url": result.post_url,
        "platform": result.platform,
    }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn open_browser(app: &AppHandle, url: &str) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    app.shell()
        .open(url, None)
        .map_err(|e| e.to_string())
}
