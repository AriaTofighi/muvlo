use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaInfo {
    pub format: FormatInfo,
    pub streams: Vec<StreamInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FormatInfo {
    pub default_val: Option<String>,
    pub filename: String,
    pub format_name: String,
    pub duration: Option<String>,
    pub size: Option<String>,
    pub bit_rate: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
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
    // We assume ffprobe is available in the system path for development.
    // Production will bundle the binary.
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            &path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe error: {}", err));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let info: MediaInfo = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe JSON: {}", e))?;

    Ok(info)
}
