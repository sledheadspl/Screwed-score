use crate::services::stream_monitor::{MonitorStatus, StreamMonitorState};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(serde::Deserialize)]
pub struct StartMonitoringPayload {
    pub url: String,
    pub platform: String,
    pub stream_id: Option<i64>,
}

#[tauri::command]
pub async fn start_monitoring(
    payload: StartMonitoringPayload,
    state: State<'_, Mutex<StreamMonitorState>>,
    app: AppHandle,
) -> Result<String, String> {
    let mut monitor = state.lock().map_err(|e| e.to_string())?;

    if monitor.is_running() {
        return Err("A stream is already being monitored. Stop it first.".to_string());
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    monitor
        .start(
            payload.url.clone(),
            payload.platform.clone(),
            payload.stream_id,
            data_dir.join("temp"),
            app.clone(),
        )
        .map_err(|e| e.to_string())?;

    Ok(format!("Started monitoring {}", payload.url))
}

#[tauri::command]
pub async fn stop_monitoring(
    state: State<'_, Mutex<StreamMonitorState>>,
) -> Result<(), String> {
    let mut monitor = state.lock().map_err(|e| e.to_string())?;
    monitor.stop();
    Ok(())
}

#[tauri::command]
pub async fn get_monitor_status(
    state: State<'_, Mutex<StreamMonitorState>>,
) -> Result<MonitorStatus, String> {
    let monitor = state.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_status())
}

#[tauri::command]
pub async fn test_stream_url(url: String) -> Result<bool, String> {
    // Basic URL validation
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    let valid_prefixes = [
        "https://www.twitch.tv/",
        "https://twitch.tv/",
        "https://www.youtube.com/",
        "https://youtube.com/",
        "https://www.kick.com/",
        "https://kick.com/",
        "rtmp://",
        "rtsp://",
    ];

    let is_valid = valid_prefixes.iter().any(|prefix| url.starts_with(prefix));
    if !is_valid {
        return Err(format!(
            "Unsupported stream URL. Supported platforms: Twitch, YouTube, Kick"
        ));
    }

    Ok(true)
}
