use tauri::Manager;

#[derive(serde::Serialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
    pub data_dir: String,
    pub clips_dir: String,
    pub temp_dir: String,
}

#[tauri::command]
pub async fn get_app_info(app: tauri::AppHandle) -> Result<AppInfo, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let version = app.package_info().version.to_string();
    let name = app.package_info().name.clone();

    Ok(AppInfo {
        version,
        name,
        data_dir: data_dir.to_string_lossy().to_string(),
        clips_dir: data_dir.join("clips").to_string_lossy().to_string(),
        temp_dir: data_dir.join("temp").to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn get_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
