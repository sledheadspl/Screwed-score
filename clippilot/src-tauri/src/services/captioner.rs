use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::services::processor::get_whisper_path;

#[derive(Debug, serde::Serialize)]
pub struct Caption {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

#[derive(Debug, serde::Serialize)]
pub struct TranscriptResult {
    pub captions: Vec<Caption>,
    pub full_text: String,
    pub ass_path: String,
}

/// Extract audio from video, run Whisper, parse output into captions.
pub fn generate_captions(
    video_path: &Path,
    output_dir: &Path,
    clip_id: &str,
    app: &AppHandle,
) -> anyhow::Result<TranscriptResult> {
    let whisper = get_whisper_path(app);

    // Extract audio to WAV
    let audio_path = output_dir.join(format!("{}.wav", clip_id));
    extract_audio(video_path, &audio_path, app)?;

    // Run Whisper
    let json_path = output_dir.join(format!("{}_transcript.json", clip_id));
    run_whisper(&whisper, &audio_path, &json_path)?;

    // Parse transcript
    let captions = parse_whisper_output(&json_path)?;

    // Build full text
    let full_text = captions
        .iter()
        .map(|c| c.text.trim().to_string())
        .collect::<Vec<_>>()
        .join(" ");

    // Generate ASS subtitle file
    let ass_path = output_dir.join(format!("{}.ass", clip_id));
    write_ass_file(&captions, &ass_path)?;

    // Cleanup audio
    std::fs::remove_file(&audio_path).ok();

    Ok(TranscriptResult {
        captions,
        full_text,
        ass_path: ass_path.to_string_lossy().to_string(),
    })
}

fn extract_audio(
    video: &Path,
    output: &Path,
    app: &AppHandle,
) -> anyhow::Result<()> {
    let ffmpeg = crate::services::processor::get_ffmpeg_path(app);
    let status = std::process::Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            video.to_str().unwrap_or(""),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            output.to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        anyhow::bail!("Failed to extract audio for captioning");
    }
    Ok(())
}

fn run_whisper(whisper: &Path, audio: &Path, json_output: &Path) -> anyhow::Result<()> {
    if !whisper.exists() {
        log::warn!("Whisper binary not found at {:?}, skipping captions", whisper);
        // Create empty JSON output
        std::fs::write(json_output, r#"{"transcription":[]}"#)?;
        return Ok(());
    }

    // Resolve model path relative to whisper binary
    let model_dir = whisper.parent().unwrap_or(Path::new("."));
    let model_path = model_dir.join("models").join("ggml-base.en.bin");

    let output_stem = json_output
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    let output_dir = json_output.parent().unwrap_or(Path::new("."));

    let status = std::process::Command::new(whisper)
        .args([
            "-m",
            model_path.to_str().unwrap_or(""),
            "-f",
            audio.to_str().unwrap_or(""),
            "-oj",
            "-of",
            output_dir.join(output_stem.as_ref()).to_str().unwrap_or(""),
        ])
        .status()?;

    if !status.success() {
        log::warn!("Whisper transcription returned non-zero exit. Creating empty transcript.");
        std::fs::write(json_output, r#"{"transcription":[]}"#)?;
    }

    Ok(())
}

fn parse_whisper_output(json_path: &Path) -> anyhow::Result<Vec<Caption>> {
    if !json_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(json_path)?;
    let data: serde_json::Value = serde_json::from_str(&content)?;

    let mut captions = vec![];

    if let Some(transcription) = data["transcription"].as_array() {
        for segment in transcription {
            let start_str = segment["offsets"]["from"].as_str().unwrap_or("00:00:00,000");
            let end_str = segment["offsets"]["to"].as_str().unwrap_or("00:00:00,000");
            let text = segment["text"].as_str().unwrap_or("").trim().to_string();

            if !text.is_empty() {
                captions.push(Caption {
                    start: parse_timestamp(start_str),
                    end: parse_timestamp(end_str),
                    text,
                });
            }
        }
    }

    Ok(captions)
}

/// Parse "HH:MM:SS,mmm" → seconds
fn parse_timestamp(ts: &str) -> f64 {
    let parts: Vec<&str> = ts.splitn(2, ',').collect();
    let ms: f64 = parts
        .get(1)
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0)
        / 1000.0;

    let hms: Vec<f64> = parts
        .first()
        .unwrap_or(&"0:0:0")
        .split(':')
        .filter_map(|s| s.parse::<f64>().ok())
        .collect();

    let h = hms.first().copied().unwrap_or(0.0);
    let m = hms.get(1).copied().unwrap_or(0.0);
    let s = hms.get(2).copied().unwrap_or(0.0);

    h * 3600.0 + m * 60.0 + s + ms
}

/// Emit centiseconds for ASS format
fn seconds_to_ass_time(secs: f64) -> String {
    let total_cs = (secs * 100.0) as u64;
    let h = total_cs / 360000;
    let m = (total_cs % 360000) / 6000;
    let s = (total_cs % 6000) / 100;
    let cs = total_cs % 100;
    format!("{:01}:{:02}:{:02}.{:02}", h, m, s, cs)
}

fn write_ass_file(captions: &[Caption], output: &PathBuf) -> anyhow::Result<()> {
    let mut ass = String::new();

    ass.push_str("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n");
    ass.push_str("[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n");
    ass.push_str("Style: Default,Montserrat,72,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,60,1\n\n");
    ass.push_str("[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n");

    for cap in captions {
        ass.push_str(&format!(
            "Dialogue: 0,{},{},Default,,0,0,0,,{}\n",
            seconds_to_ass_time(cap.start),
            seconds_to_ass_time(cap.end),
            cap.text.replace('\n', "\\N"),
        ));
    }

    std::fs::write(output, ass)?;
    Ok(())
}
