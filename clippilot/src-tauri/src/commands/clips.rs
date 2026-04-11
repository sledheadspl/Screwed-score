use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_clips_dir(app: AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let clips_dir = data_dir.join("clips");
    std::fs::create_dir_all(&clips_dir).map_err(|e| e.to_string())?;
    Ok(clips_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_clip_file(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    // Safety: only allow deletion within clips directory
    if !file_path.contains("clips") && !file_path.contains("temp") {
        return Err("Cannot delete files outside clips/temp directories".to_string());
    }

    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;

        // Also remove thumbnail if it exists
        if let Some(stem) = path.file_stem() {
            let thumb_path = path
                .parent()
                .unwrap_or(&path)
                .join(format!("{}_thumb.jpg", stem.to_string_lossy()));
            if thumb_path.exists() {
                std::fs::remove_file(&thumb_path).ok();
            }
        }
    }

    Ok(())
}

#[derive(serde::Serialize)]
pub struct ThumbnailResult {
    pub path: String,
    pub success: bool,
}

#[tauri::command]
pub async fn generate_thumbnail(
    clip_path: String,
    app: AppHandle,
) -> Result<ThumbnailResult, String> {
    let clip = PathBuf::from(&clip_path);
    if !clip.exists() {
        return Err(format!("Clip file not found: {}", clip_path));
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let thumb_name = format!(
        "{}_thumb.jpg",
        clip.file_stem()
            .unwrap_or_default()
            .to_string_lossy()
    );
    let thumb_path = data_dir.join("clips").join(&thumb_name);

    // Use FFmpeg to extract thumbnail at 1 second mark
    let ffmpeg = crate::services::processor::get_ffmpeg_path(&app);

    let output = std::process::Command::new(&ffmpeg)
        .args([
            "-y",
            "-ss",
            "1",
            "-i",
            &clip_path,
            "-vframes",
            "1",
            "-vf",
            "scale=480:270",
            "-q:v",
            "3",
            thumb_path.to_str().unwrap_or(""),
        ])
        .output()
        .map_err(|e| format!("FFmpeg failed: {}", e))?;

    if output.status.success() {
        Ok(ThumbnailResult {
            path: thumb_path.to_string_lossy().to_string(),
            success: true,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg thumbnail error: {}", stderr))
    }
}

#[derive(serde::Serialize)]
pub struct ClipDuration {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn get_clip_duration(clip_path: String, app: AppHandle) -> Result<ClipDuration, String> {
    let ffprobe = crate::services::processor::get_ffprobe_path(&app);

    let output = std::process::Command::new(&ffprobe)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            &clip_path,
        ])
        .output()
        .map_err(|e| format!("ffprobe failed: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe failed to read clip".to_string());
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams
                .iter()
                .find(|s| s["codec_type"].as_str() == Some("video"))
        })
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let width = video_stream["width"].as_u64().unwrap_or(1920) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(1080) as u32;

    Ok(ClipDuration {
        duration,
        width,
        height,
    })
}
