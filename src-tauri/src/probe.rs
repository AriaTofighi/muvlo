use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct MediaInfo {
    pub format: FormatInfo,
    pub streams: Vec<StreamInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct FormatInfo {
    pub filename: String,
    pub format_name: String,
    pub duration: Option<String>,
    pub size: Option<String>,
    pub bit_rate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct StreamInfo {
    pub index: usize,
    pub codec_name: Option<String>,
    pub codec_type: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub sample_rate: Option<String>,
    pub channels: Option<u32>,
}

#[tauri::command]
pub async fn get_media_info(path: String) -> Result<MediaInfo, String> {
    probe_media_info(Path::new(&path)).await
}

pub async fn probe_media_info(path: &Path) -> Result<MediaInfo, String> {
    let path_string = path.to_string_lossy().to_string();
    let mut command = Command::new(tool_path("MUVLO_FFPROBE_PATH", "ffprobe"));
    command.args([
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        &path_string,
    ]);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe error: {err}"));
    }

    serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse ffprobe JSON: {e}"))
}

pub async fn probe_duration_seconds(path: &Path) -> Result<Option<f64>, String> {
    let info = probe_media_info(path).await?;
    Ok(info
        .format
        .duration
        .as_deref()
        .and_then(|duration| duration.parse::<f64>().ok()))
}

#[tauri::command]
pub async fn get_ffprobe_available() -> Result<bool, String> {
    let mut command = Command::new(tool_path("MUVLO_FFPROBE_PATH", "ffprobe"));
    command.arg("-version");
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe: {e}"))?;

    Ok(output.status.success())
}

fn tool_path(env_name: &str, default: &str) -> String {
    std::env::var(env_name).unwrap_or_else(|_| default.to_string())
}
