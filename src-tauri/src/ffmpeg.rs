use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub job_id: String,
    pub time_str: String,
    pub percentage: Option<f64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct JobCompletePayload {
    pub job_id: String,
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn run_ffmpeg(
    app: AppHandle,
    job_id: String,
    args: Vec<String>,
    total_duration_secs: Option<f64>,
) -> Result<(), String> {
    let mut child = Command::new("ffmpeg")
        .args(&args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    let stderr = child.stderr.take().unwrap();
    let mut reader = BufReader::new(stderr).lines();

    // ffmpeg progress example: frame=  123 fps= 30 q=28.0 size=    1024kB time=00:00:04.12 bitrate=2034.1kbits/s speed=1.01x
    let re = Regex::new(r"time=(\d{2}):(\d{2}):(\d{2}\.\d{2})").unwrap();

    let job_id_clone = job_id.clone();
    
    // Spawn a task to read stderr and emit progress
    tokio::spawn(async move {
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(caps) = re.captures(&line) {
                if caps.len() == 4 {
                    let h: f64 = caps[1].parse().unwrap_or(0.0);
                    let m: f64 = caps[2].parse().unwrap_or(0.0);
                    let s: f64 = caps[3].parse().unwrap_or(0.0);
                    let secs = h * 3600.0 + m * 60.0 + s;
                    
                    let percentage = total_duration_secs.map(|total| (secs / total) * 100.0);
                    let time_str = format!("{}:{}:{}", &caps[1], &caps[2], &caps[3]);

                    let _ = app.emit(
                        "ffmpeg-progress",
                        ProgressPayload {
                            job_id: job_id_clone.clone(),
                            time_str,
                            percentage,
                        },
                    );
                }
            }
        }
    });

    // Wait for process to finish
    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait on ffmpeg: {}", e))?;

    Ok(())
}
