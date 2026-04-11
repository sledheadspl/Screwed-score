use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::AppHandle;

#[derive(Debug, Default, serde::Serialize, Clone)]
pub struct MonitorStatus {
    pub is_running: bool,
    pub platform: Option<String>,
    pub url: Option<String>,
    pub stream_id: Option<i64>,
    pub started_at: Option<String>,
    pub clips_generated: u32,
    pub segments_buffered: u32,
    pub current_score: f32,
}

pub struct StreamMonitorState {
    running: Arc<AtomicBool>,
    status: MonitorStatus,
    handle: Option<std::thread::JoinHandle<()>>,
}

impl Default for StreamMonitorState {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            status: MonitorStatus::default(),
            handle: None,
        }
    }
}

impl StreamMonitorState {
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    pub fn get_status(&self) -> MonitorStatus {
        self.status.clone()
    }

    pub fn start(
        &mut self,
        url: String,
        platform: String,
        stream_id: Option<i64>,
        temp_dir: PathBuf,
        app: AppHandle,
    ) -> anyhow::Result<()> {
        if self.is_running() {
            anyhow::bail!("Already monitoring a stream");
        }

        self.running.store(true, Ordering::Relaxed);
        self.status = MonitorStatus {
            is_running: true,
            platform: Some(platform.clone()),
            url: Some(url.clone()),
            stream_id,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            clips_generated: 0,
            segments_buffered: 0,
            current_score: 0.0,
        };

        let running = self.running.clone();
        let app_handle = app.clone();

        std::thread::spawn(move || {
            monitor_loop(url, platform, stream_id, temp_dir, running, app_handle);
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);
        self.status.is_running = false;
        log::info!("Stream monitoring stopped");
    }
}

fn monitor_loop(
    url: String,
    platform: String,
    _stream_id: Option<i64>,
    temp_dir: PathBuf,
    running: Arc<AtomicBool>,
    app: AppHandle,
) {
    log::info!("Starting stream monitor for: {}", url);

    // Emit connected event
    let _ = app.emit(
        "stream_connected",
        serde_json::json!({
            "url": url,
            "platform": platform,
        }),
    );

    // Main monitoring loop — will be fleshed out in Phase 2
    // For now it just emits a status event every 5 seconds
    while running.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_secs(5));

        let _ = app.emit(
            "stream_status",
            serde_json::json!({
                "is_running": true,
                "platform": platform,
                "url": url,
                "segments_buffered": 0,
            }),
        );
    }

    // Cleanup temp segments
    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("ts") {
                std::fs::remove_file(&path).ok();
            }
        }
    }

    let _ = app.emit("stream_disconnected", serde_json::json!({"url": url}));
    log::info!("Stream monitor loop ended for: {}", url);
}
