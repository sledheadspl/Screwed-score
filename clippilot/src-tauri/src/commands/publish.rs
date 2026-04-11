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
