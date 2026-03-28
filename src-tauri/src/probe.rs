use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
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
#[serde(rename_all = "camelCase")]
pub struct WaveformPreview {
    pub data_url: Option<String>,
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
    pub avg_frame_rate: Option<String>,
    pub sample_rate: Option<String>,
    pub channels: Option<u32>,
}

#[tauri::command]
pub async fn get_media_info(path: String) -> Result<MediaInfo, String> {
    probe_media_info(Path::new(&path)).await
}

#[tauri::command]
pub async fn get_waveform_preview(
    path: String,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<WaveformPreview, String> {
    render_waveform_preview(Path::new(&path), width.unwrap_or(960), height.unwrap_or(120)).await
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

async fn render_waveform_preview(
    path: &Path,
    width: u32,
    height: u32,
) -> Result<WaveformPreview, String> {
    let info = probe_media_info(path).await?;
    let has_audio = info
        .streams
        .iter()
        .any(|stream| stream.codec_type == "audio");

    if !has_audio {
        return Ok(WaveformPreview { data_url: None });
    }

    let size = format!("{}x{}", width.max(120), height.max(48));
    let path_string = path.to_string_lossy().to_string();
    let mut command = Command::new(tool_path("MUVLO_FFMPEG_PATH", "ffmpeg"));
    command.args([
        "-v",
        "error",
        "-i",
        &path_string,
        "-map",
        "0:a:0",
        "-filter_complex",
        &format!("aformat=channel_layouts=mono,showwavespic=s={size}:colors=white"),
        "-frames:v",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
    ]);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .output()
        .await
        .map_err(|e| format!("Failed to render waveform preview: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg waveform preview error: {err}"));
    }

    let data_url = format!(
        "data:image/png;base64,{}",
        BASE64_STANDARD.encode(&output.stdout)
    );

    Ok(WaveformPreview {
        data_url: Some(data_url),
    })
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
