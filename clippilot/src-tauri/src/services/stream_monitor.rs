use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::services::detector::{DetectionConfig, MomentDetector};
use crate::services::processor::{self, get_ffmpeg_path, ProcessClipRequest};

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
    status: Arc<Mutex<MonitorStatus>>,
}

impl Default for StreamMonitorState {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            status: Arc::new(Mutex::new(MonitorStatus::default())),
        }
    }
}

impl StreamMonitorState {
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    pub fn get_status(&self) -> MonitorStatus {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
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

        {
            let mut s = self.status.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
            *s = MonitorStatus {
                is_running: true,
                platform: Some(platform.clone()),
                url: Some(url.clone()),
                stream_id,
                started_at: Some(chrono::Utc::now().to_rfc3339()),
                clips_generated: 0,
                segments_buffered: 0,
                current_score: 0.0,
            };
        }

        let running = self.running.clone();
        let status = self.status.clone();

        tauri::async_runtime::spawn(async move {
            if let Err(e) =
                monitor_loop(url, platform, temp_dir, running.clone(), status, app).await
            {
                log::error!("Monitor loop error: {}", e);
                running.store(false, Ordering::Relaxed);
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);
        if let Ok(mut s) = self.status.lock() {
            s.is_running = false;
        }
        log::info!("Stream monitoring stopped");
    }
}

// ── Core monitor loop ─────────────────────────────────────────────────────────

async fn monitor_loop(
    url: String,
    platform: String,
    temp_dir: PathBuf,
    running: Arc<AtomicBool>,
    status: Arc<Mutex<MonitorStatus>>,
    app: AppHandle,
) -> anyhow::Result<()> {
    let ffmpeg = get_ffmpeg_path(&app);

    // Unique segment directory per session
    let seg_dir = temp_dir.join(format!("sess_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&seg_dir)?;

    let _ = app.emit(
        "stream_connected",
        serde_json::json!({"url": &url, "platform": &platform}),
    );

    // Spawn FFmpeg to pull HLS stream and segment it
    let seg_pattern = seg_dir.join("%04d.ts");
    let mut ffmpeg_proc = tokio::process::Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            &url,
            "-f",
            "segment",
            "-segment_time",
            "4",
            "-segment_format",
            "mpegts",
            "-reset_timestamps",
            "1",
            "-vcodec",
            "copy",
            "-acodec",
            "copy",
            seg_pattern.to_str().unwrap_or(""),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()?;

    // Twitch: connect to IRC for real-time chat count
    let chat_count = Arc::new(AtomicU32::new(0));
    if platform == "twitch" {
        if let Some(channel) = extract_twitch_channel(&url) {
            let chat_clone = chat_count.clone();
            let running_clone = running.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = twitch_irc_loop(channel, chat_clone, running_clone).await {
                    log::warn!("Twitch IRC disconnected: {}", e);
                }
            });
        }
    }

    // Detection setup
    let detection_config = DetectionConfig::default();
    let mut detector = MomentDetector::new(detection_config.clone());
    let start_instant = Instant::now();
    let mut last_processed: i32 = -1;
    let clips_dir = temp_dir
        .parent()
        .unwrap_or(&temp_dir)
        .join("clips");
    std::fs::create_dir_all(&clips_dir)?;

    // ── Segment processing loop ───────────────────────────────────────────────
    while running.load(Ordering::Relaxed) {
        let seg_nums = scan_segments(&seg_dir);

        // Only process segments that aren't the current one being written
        if seg_nums.len() > 1 {
            for &seg_num in seg_nums.iter().take(seg_nums.len() - 1) {
                if seg_num as i32 > last_processed {
                    let seg_path = seg_dir.join(format!("{:04}.ts", seg_num));
                    let timestamp = start_instant.elapsed().as_secs_f64();

                    // Update buffered count
                    if let Ok(mut s) = status.lock() {
                        s.segments_buffered = seg_num + 1;
                    }

                    // Extract audio RMS from segment
                    let rms = extract_audio_rms(&ffmpeg, &seg_path)
                        .await
                        .unwrap_or(0.0);
                    let chat = chat_count.swap(0, Ordering::Relaxed);

                    // Emit real-time metrics to UI
                    let _ = app.emit(
                        "audio_level",
                        serde_json::json!({"rms": rms, "timestamp": timestamp}),
                    );
                    let _ = app.emit(
                        "chat_update",
                        serde_json::json!({"count": chat, "timestamp": timestamp}),
                    );

                    // Feed detection engine
                    detector.push_audio_sample(rms);
                    detector.push_chat_count(chat);

                    if let Some(moment) =
                        detector.evaluate(timestamp, rms, chat, None, None)
                    {
                        log::info!(
                            "Moment detected! score={:.1} reason={}",
                            moment.score,
                            moment.trigger_reason
                        );
                        let _ = app.emit("moment_detected", &moment);

                        if let Ok(mut s) = status.lock() {
                            s.current_score = moment.score;
                        }

                        // Collect segments covering the clip window
                        let input_segs = collect_segments_for_window(
                            &seg_dir,
                            seg_num,
                            detection_config.pre_roll_seconds,
                            detection_config.post_roll_seconds,
                        );

                        if let Some(concat_list) =
                            build_concat_list_file(&input_segs, &seg_dir)
                        {
                            let clip_id =
                                uuid::Uuid::new_v4().to_string().replace('-', "");
                            let clip_duration = (detection_config.pre_roll_seconds
                                + detection_config.post_roll_seconds)
                                as f64;
                            let req = ProcessClipRequest {
                                input_path: concat_list,
                                output_dir: clips_dir.to_string_lossy().to_string(),
                                clip_id: clip_id.clone(),
                                start_time: 0.0,
                                duration: clip_duration,
                                add_captions: true,
                                add_watermark: false,
                                watermark_path: None,
                                caption_font: "Montserrat".to_string(),
                                caption_color: "white".to_string(),
                            };

                            let app_clip = app.clone();
                            let app_for_proc = app_clip.clone();
                            let status_clip = status.clone();
                            tauri::async_runtime::spawn(async move {
                                match tokio::task::spawn_blocking(move || {
                                    processor::process_clip(&req, &app_for_proc)
                                })
                                .await
                                {
                                    Ok(Ok(result)) => {
                                        let _ = app_clip.emit(
                                            "clip_ready",
                                            serde_json::json!({
                                                "clip_id": &clip_id,
                                                "file_path": result.output_path,
                                                "thumbnail_path": result.thumbnail_path,
                                                "duration": result.duration,
                                            }),
                                        );
                                        if let Ok(mut s) = status_clip.lock() {
                                            s.clips_generated += 1;
                                        }
                                    }
                                    Ok(Err(e)) => {
                                        log::error!("Clip processing failed: {}", e)
                                    }
                                    Err(e) => {
                                        log::error!("Clip task panicked: {}", e)
                                    }
                                }
                            });
                        }
                    }

                    last_processed = seg_num as i32;

                    // Keep only the last 30 segments (~2 min) to save disk space
                    if seg_num > 30 {
                        let old = seg_dir.join(format!("{:04}.ts", seg_num - 30));
                        std::fs::remove_file(&old).ok();
                    }
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    // Kill FFmpeg
    ffmpeg_proc.kill().await.ok();

    // Cleanup temp segments
    std::fs::remove_dir_all(&seg_dir).ok();

    let _ = app.emit("stream_disconnected", serde_json::json!({"url": url}));
    log::info!("Monitor loop ended");
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn scan_segments(seg_dir: &PathBuf) -> Vec<u32> {
    let mut nums: Vec<u32> = std::fs::read_dir(seg_dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| {
            let name = e.file_name();
            let s = name.to_string_lossy().to_string();
            if s.ends_with(".ts") {
                s.trim_end_matches(".ts").parse::<u32>().ok()
            } else {
                None
            }
        })
        .collect();
    nums.sort_unstable();
    nums
}

/// Extract mean audio level from a segment using FFmpeg volumedetect.
async fn extract_audio_rms(ffmpeg: &PathBuf, seg_path: &PathBuf) -> anyhow::Result<f32> {
    let output = tokio::process::Command::new(ffmpeg)
        .args([
            "-i",
            seg_path.to_str().unwrap_or(""),
            "-filter_complex",
            "volumedetect",
            "-f",
            "null",
            "-",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
        .await?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    for line in stderr.lines() {
        if line.contains("mean_volume:") {
            if let Some(part) = line.split("mean_volume:").nth(1) {
                if let Ok(db) = part.trim().trim_end_matches(" dBFS").parse::<f32>() {
                    // Convert dBFS to linear 0.0-1.0 (0 dBFS = 1.0, -60 dBFS ≈ 0.001)
                    let linear = 10.0f32.powf(db / 20.0);
                    return Ok(linear.clamp(0.0, 1.0));
                }
            }
        }
    }

    Ok(0.0)
}

fn extract_twitch_channel(url: &str) -> Option<String> {
    let url = url.trim_end_matches('/');
    url.split('/').last().map(|s| s.to_lowercase())
}

fn collect_segments_for_window(
    seg_dir: &PathBuf,
    current_seg: u32,
    pre_roll: u32,
    post_roll: u32,
) -> Vec<PathBuf> {
    // Each segment is ~4 seconds
    let segs_pre = (pre_roll / 4) + 1;
    let segs_post = (post_roll / 4) + 1;
    let start_seg = current_seg.saturating_sub(segs_pre);
    let end_seg = current_seg + segs_post;

    (start_seg..=end_seg)
        .filter_map(|n| {
            let p = seg_dir.join(format!("{:04}.ts", n));
            if p.exists() { Some(p) } else { None }
        })
        .collect()
}

/// Write an FFmpeg concat demuxer list file and return the path.
fn build_concat_list_file(
    segments: &[PathBuf],
    seg_dir: &PathBuf,
) -> Option<String> {
    if segments.is_empty() {
        return None;
    }
    let list_path = seg_dir.join("concat_list.txt");
    let content: String = segments
        .iter()
        .map(|p| format!("file '{}'\n", p.to_string_lossy().replace('\\', "/")))
        .collect();
    std::fs::write(&list_path, content).ok()?;
    // Use @concat: sentinel so processor.rs can pass the path as a single arg
    // (avoids split_whitespace breaking on Windows paths with spaces)
    Some(format!("@concat:{}", list_path.to_string_lossy()))
}

// ── Twitch IRC (anonymous read-only chat) ─────────────────────────────────────

async fn twitch_irc_loop(
    channel: String,
    chat_count: Arc<AtomicU32>,
    running: Arc<AtomicBool>,
) -> anyhow::Result<()> {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::net::TcpStream;

    let stream = TcpStream::connect("irc.chat.twitch.tv:6667").await?;
    let (reader, mut writer) = tokio::io::split(stream);
    let mut lines = BufReader::new(reader).lines();

    // Anonymous Twitch IRC login (no OAuth needed for read-only)
    let nick = format!("justinfan{}", anon_id());
    writer.write_all(b"PASS SCHMOOPIIE\r\n").await?;
    writer
        .write_all(format!("NICK {}\r\n", nick).as_bytes())
        .await?;
    writer
        .write_all(format!("JOIN #{}\r\n", channel).as_bytes())
        .await?;

    while running.load(Ordering::Relaxed) {
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(30),
            lines.next_line(),
        )
        .await
        {
            Ok(Ok(Some(line))) => {
                if line.starts_with("PING") {
                    writer.write_all(b"PONG :tmi.twitch.tv\r\n").await?;
                } else if line.contains("PRIVMSG") {
                    chat_count.fetch_add(1, Ordering::Relaxed);
                }
            }
            Ok(Ok(None)) => break, // connection closed
            Ok(Err(e)) => {
                log::warn!("IRC read error: {}", e);
                break;
            }
            Err(_) => {
                // Timeout — send keepalive
                writer.write_all(b"PING :tmi.twitch.tv\r\n").await?;
            }
        }
    }

    Ok(())
}

fn anon_id() -> u32 {
    rand::random::<u32>() % 999_999
}
