pub mod commands;
pub mod db;
pub mod services;

use commands::{clips, publish, settings, stream};
use services::stream_monitor::StreamMonitorState;
use std::sync::Mutex;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .manage(Mutex::new(StreamMonitorState::default()))
        .invoke_handler(tauri::generate_handler![
            // Settings
            settings::get_app_info,
            settings::get_data_dir,
            settings::open_data_dir,
            // Stream commands
            stream::start_monitoring,
            stream::stop_monitoring,
            stream::get_monitor_status,
            stream::test_stream_url,
            // Clip commands
            clips::get_clips_dir,
            clips::delete_clip_file,
            clips::generate_thumbnail,
            clips::get_clip_duration,
            // Publish commands
            publish::validate_publish_config,
            publish::get_supported_platforms,
            publish::start_oauth_flow,
            publish::refresh_oauth_token,
            publish::publish_clip,
        ])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();

            let clips_dir = app_data_dir.join("clips");
            std::fs::create_dir_all(&clips_dir).ok();

            let temp_dir = app_data_dir.join("temp");
            std::fs::create_dir_all(&temp_dir).ok();

            log::info!("ClipPilot started. Data dir: {:?}", app_data_dir);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ClipPilot");
}
