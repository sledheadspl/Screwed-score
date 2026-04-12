use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;

/// Resolve the bundled FFmpeg binary path.
pub fn get_ffmpeg_path(app: &AppHandle) -> PathBuf {
    // Try bundled binary first
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir
            .join("binaries")
            .join("ffmpeg")
            .join(if cfg!(target_os = "windows") {
                "ffmpeg.exe"
            } else {
                "ffmpeg"
            });
        if bundled.exists() {
            return bundled;
        }
    }
    // Fall back to system FFmpeg
    PathBuf::from(if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    })
}

/// Resolve the bundled ffprobe binary path.
pub fn get_ffprobe_path(app: &AppHandle) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir
            .join("binaries")
            .join("ffmpeg")
            .join(if cfg!(target_os = "windows") {
                "ffprobe.exe"
            } else {
                "ffprobe"
            });
        if bundled.exists() {
            return bundled;
        }
    }
    PathBuf::from(if cfg!(target_os = "windows") {
        "ffprobe.exe"
    } else {
        "ffprobe"
    })
}

/// Resolve the bundled Whisper binary path.
pub fn get_whisper_path(app: &AppHandle) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir
            .join("binaries")
            .join("whisper")
            .join(if cfg!(target_os = "windows") {
                "main.exe"
            } else {
                "main"
            });
        if bundled.exists() {
            return bundled;
        }
    }
    PathBuf::from("whisper")
}

#[derive(Debug, serde::Deserialize)]
pub struct ProcessClipRequest {
    pub input_path: String,
    pub output_dir: String,
    pub clip_id: String,
    pub start_time: f64,
    pub duration: f64,
    pub add_captions: bool,
    pub add_watermark: bool,
    pub watermark_path: Option<String>,
    pub caption_font: String,
    pub caption_color: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ProcessClipResult {
    pub output_path: String,
    pub thumbnail_path: String,
    pub duration: f64,
}

/// Full processing pipeline: extract → crop → captions → watermark
pub fn process_clip(
    req: &ProcessClipRequest,
    app: &AppHandle,
) -> anyhow::Result<ProcessClipResult> {
    let ffmpeg = get_ffmpeg_path(app);
    let output_dir = PathBuf::from(&req.output_dir);
    std::fs::create_dir_all(&output_dir)?;

    // Step 1: Extract raw segment
    let raw_path = output_dir.join(format!("{}_raw.mp4", req.clip_id));
    extract_segment(&ffmpeg, &req.input_path, req.start_time, req.duration, &raw_path)?;

    // Step 2: Crop to vertical 9:16
    let vertical_path = output_dir.join(format!("{}_vertical.mp4", req.clip_id));
    crop_to_vertical(&ffmpeg, &raw_path, &vertical_path)?;

    // Step 3: Add captions via Whisper (if enabled)
    let captioned_path = if req.add_captions {
        let cap_path = output_dir.join(format!("{}_captioned.mp4", req.clip_id));
        match crate::services::captioner::generate_captions(
            &vertical_path,
            &output_dir,
            &req.clip_id,
            app,
        ) {
            Ok(transcript) if !transcript.captions.is_empty() => {
                burn_captions_into_video(
                    &ffmpeg,
                    &vertical_path,
                    &transcript.ass_path,
                    &cap_path,
                )?;
                // Cleanup ASS file
                std::fs::remove_file(&transcript.ass_path).ok();
                cap_path
            }
            _ => {
                // Whisper unavailable or empty transcript — skip captions silently
                vertical_path.clone()
            }
        }
    } else {
        vertical_path.clone()
    };

    // Step 4: Add watermark (free tier)
    let final_path = output_dir.join(format!("{}.mp4", req.clip_id));
    if req.add_watermark {
        if let Some(wm_path) = &req.watermark_path {
            if Path::new(wm_path).exists() {
                add_watermark(&ffmpeg, &captioned_path, wm_path, &final_path)?;
            } else {
                std::fs::copy(&captioned_path, &final_path)?;
            }
        } else {
            std::fs::copy(&captioned_path, &final_path)?;
        }
    } else {
        std::fs::copy(&captioned_path, &final_path)?;
    }

    // Step 5: Generate thumbnail
    let thumb_path = output_dir.join(format!("{}_thumb.jpg", req.clip_id));
    generate_thumbnail_at(&ffmpeg, &final_path, 1.0, &thumb_path)?;

    // Cleanup intermediates
    for path in [&raw_path, &vertical_path, &captioned_path] {
        if path != &final_path {
            std::fs::remove_file(path).ok();
        }
    }

    Ok(ProcessClipResult {
        output_path: final_path.to_string_lossy().to_string(),
        thumbnail_path: thumb_path.to_string_lossy().to_string(),
        duration: req.duration,
    })
}

fn extract_segment(
    ffmpeg: &Path,
    input: &str,
    start: f64,
    duration: f64,
    output: &Path,
) -> anyhow::Result<()> {
    // input may be a plain path OR a "-f concat -safe 0 -i <list>" string
    let mut cmd = std::process::Command::new(ffmpeg);
    cmd.arg("-y");

    if input.starts_with("-f concat") {
        // Split the pre-built concat args into individual args
        for part in input.split_whitespace() {
            cmd.arg(part);
        }
    } else {
        cmd.args(["-ss", &start.to_string(), "-i", input]);
    }

    cmd.args([
        "-t",
        &duration.to_string(),
        "-c",
        "copy",
        output.to_str().unwrap_or(""),
    ]);

    let status = cmd.status()?;
    if !status.success() {
        anyhow::bail!("FFmpeg extract_segment failed");
    }
    Ok(())
}

fn crop_to_vertical(ffmpeg: &Path, input: &Path, output: &Path) -> anyhow::Result<()> {
    // Must re-encode video when applying a filter — cannot stream-copy through vf
    let status = std::process::Command::new(ffmpeg)
        .args([
            "-y",
            "-i",
            input.to_str().unwrap_or(""),
            "-vf",
            "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-c:a",
            "aac",
            output.to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("FFmpeg crop_to_vertical failed");
    }
    Ok(())
}

fn add_watermark(
    ffmpeg: &Path,
    input: &Path,
    watermark: &str,
    output: &Path,
) -> anyhow::Result<()> {
    let status = std::process::Command::new(ffmpeg)
        .args([
            "-y",
            "-i",
            input.to_str().unwrap_or(""),
            "-i",
            watermark,
            "-filter_complex",
            "overlay=W-w-20:H-h-20:alpha=0.7",
            "-c:a",
            "copy",
            output.to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("FFmpeg add_watermark failed");
    }
    Ok(())
}

pub fn burn_captions_into_video(
    ffmpeg: &Path,
    input: &Path,
    ass_path: &str,
    output: &Path,
) -> anyhow::Result<()> {
    // Escape path for FFmpeg's subtitles filter on Windows
    let ass_escaped = ass_path.replace('\\', "/").replace(':', "\\:");
    let vf = format!("subtitles={}", ass_escaped);
    let status = std::process::Command::new(ffmpeg)
        .args([
            "-y",
            "-i",
            input.to_str().unwrap_or(""),
            "-vf",
            &vf,
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-c:a",
            "copy",
            output.to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("FFmpeg caption burn failed");
    }
    Ok(())
}

fn generate_thumbnail_at(
    ffmpeg: &Path,
    input: &Path,
    time: f64,
    output: &Path,
) -> anyhow::Result<()> {
    let status = std::process::Command::new(ffmpeg)
        .args([
            "-y",
            "-ss",
            &time.to_string(),
            "-i",
            input.to_str().unwrap_or(""),
            "-vframes",
            "1",
            "-vf",
            "scale=480:270",
            "-q:v",
            "3",
            output.to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("FFmpeg thumbnail generation failed");
    }
    Ok(())
}
