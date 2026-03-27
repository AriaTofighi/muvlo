use crate::probe::probe_duration_seconds;
use regex::Regex;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    fs,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, OnceLock,
    },
};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
    sync::{Mutex, Notify},
};

const JOB_PROGRESS_EVENT: &str = "job-progress";
const JOB_COMPLETE_EVENT: &str = "job-complete";
const FFMPEG_ENV_NAME: &str = "MUVLO_FFMPEG_PATH";
const FFPROBE_ENV_NAME: &str = "MUVLO_FFPROBE_PATH";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFile {
    pub path: String,
    pub name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaJobRequest {
    pub job_id: String,
    #[serde(flatten)]
    pub workflow: MediaJobWorkflow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "workflow", rename_all = "snake_case")]
pub enum MediaJobWorkflow {
    Convert(ConvertJobRequest),
    Trim(TrimJobRequest),
    Compress(CompressJobRequest),
    Merge(MergeJobRequest),
    ExtractAudio(ExtractAudioJobRequest),
    Subtitles(SubtitlesJobRequest),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertJobRequest {
    pub input_path: String,
    pub output_path: String,
    #[serde(default)]
    pub video_codec: Option<String>,
    #[serde(default)]
    pub audio_codec: Option<String>,
    #[serde(default)]
    pub subtitle_codec: Option<String>,
    #[serde(default)]
    pub extra_args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimJobRequest {
    pub input_path: String,
    pub output_path: String,
    pub start_seconds: f64,
    #[serde(default)]
    pub end_seconds: Option<f64>,
    #[serde(default)]
    pub reencode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressJobRequest {
    pub input_path: String,
    pub output_path: String,
    #[serde(default = "default_quality")]
    pub quality: u8,
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    pub audio_bitrate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeJobRequest {
    pub input_paths: Vec<String>,
    pub output_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractAudioJobRequest {
    pub input_path: String,
    pub output_path: String,
    pub format: AudioFormat,
    #[serde(default)]
    pub bitrate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitlesJobRequest {
    pub input_path: String,
    pub subtitle_path: String,
    pub output_path: String,
    #[serde(default)]
    pub burn_in: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AudioFormat {
    Mp3,
    Aac,
    Wav,
    Flac,
    Ogg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobProgressEvent {
    pub job_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress_percent: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_seconds: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fps: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub eta_seconds: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobCompleteEvent {
    pub job_id: String,
    pub success: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaToolStatus {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ffmpeg_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ffprobe_version: Option<String>,
}

#[derive(Clone, Default)]
pub struct JobRegistry {
    jobs: Arc<Mutex<HashMap<String, Arc<JobControl>>>>,
}

struct JobControl {
    cancelled: AtomicBool,
    cancel_notify: Arc<Notify>,
}

impl JobControl {
    fn new() -> Self {
        Self {
            cancelled: AtomicBool::new(false),
            cancel_notify: Arc::new(Notify::new()),
        }
    }
}

#[derive(Debug)]
struct CommandPlan {
    args: Vec<String>,
    cleanup_files: Vec<PathBuf>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MediaFlavor {
    Video,
    AudioOnly,
    Unknown,
}

pub fn configure_tool_paths<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Some(ffmpeg_path) = resolve_bundled_tool_path(app, ffmpeg_resource_relative_path("ffmpeg")) {
        env::set_var(FFMPEG_ENV_NAME, ffmpeg_path);
    }

    if let Some(ffprobe_path) = resolve_bundled_tool_path(app, ffmpeg_resource_relative_path("ffprobe")) {
        env::set_var(FFPROBE_ENV_NAME, ffprobe_path);
    }
}

#[tauri::command]
pub async fn pick_input_files(
    multiple: bool,
    filters: Option<Vec<FileFilter>>,
) -> Result<Vec<SelectedFile>, String> {
    let filters = filters.unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = FileDialog::new();

        for filter in filters {
            dialog = dialog.add_filter(&filter.name, &filter.extensions);
        }

        let files = if multiple {
            dialog.pick_files()
        } else {
            dialog.pick_file().map(|file| vec![file])
        };

        Ok::<Vec<SelectedFile>, String>(
            files
                .unwrap_or_default()
                .into_iter()
                .map(|path| {
                    file_metadata(&path).unwrap_or_else(|_| SelectedFile {
                        path: path.to_string_lossy().to_string(),
                        name: path
                            .file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or_default()
                            .to_string(),
                        size_bytes: 0,
                    })
                })
                .collect::<Vec<_>>(),
        )
    })
    .await
    .map_err(|e| format!("Failed to open file picker: {e}"))?
}

#[tauri::command]
pub async fn resolve_dropped_paths(paths: Vec<String>) -> Result<Vec<SelectedFile>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Ok::<Vec<SelectedFile>, String>(
            paths
                .into_iter()
                .map(PathBuf::from)
                .filter(|path| path.is_file())
                .map(|path| {
                    file_metadata(&path).unwrap_or_else(|_| SelectedFile {
                        path: path.to_string_lossy().to_string(),
                        name: path
                            .file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or_default()
                            .to_string(),
                        size_bytes: 0,
                    })
                })
                .collect(),
        )
    })
    .await
    .map_err(|e| format!("Failed to resolve dropped files: {e}"))?
}

#[tauri::command]
pub async fn pick_output_path(suggested_name: Option<String>) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = FileDialog::new();
        if let Some(name) = suggested_name {
            dialog = dialog.set_file_name(name);
        }

        Ok::<Option<String>, String>(
            dialog
                .save_file()
                .map(|path| path.to_string_lossy().to_string()),
        )
    })
    .await
    .map_err(|e| format!("Failed to open save dialog: {e}"))?
}

#[tauri::command]
pub async fn get_media_tool_status() -> Result<MediaToolStatus, String> {
    let ffmpeg_available = tool_available(FFMPEG_ENV_NAME, "ffmpeg").await;
    let ffprobe_available = tool_available(FFPROBE_ENV_NAME, "ffprobe").await;

    let ffmpeg_version = tool_version(FFMPEG_ENV_NAME, "ffmpeg").await;
    let ffprobe_version = tool_version(FFPROBE_ENV_NAME, "ffprobe").await;

    Ok(MediaToolStatus {
        ffmpeg_available,
        ffprobe_available,
        ffmpeg_version,
        ffprobe_version,
    })
}

#[tauri::command]
pub async fn start_media_job(
    app: AppHandle,
    registry: State<'_, JobRegistry>,
    request: MediaJobRequest,
) -> Result<String, String> {
    validate_job_id(&request.job_id)?;

    let job_id = request.job_id.clone();
    let output_path = workflow_output_path(&request.workflow).map(ToOwned::to_owned);
    let control = Arc::new(JobControl::new());
    registry.insert(job_id.clone(), control.clone()).await?;

    let app_handle = app.clone();
    let registry_handle = (*registry).clone();
    let job_id_for_spawn = job_id.clone();

    tokio::spawn(async move {
        let result = execute_media_job(app_handle, control, request).await;

        if let Err(error) = result {
            let _ = app.emit(
                JOB_COMPLETE_EVENT,
                JobCompleteEvent {
                    job_id: job_id_for_spawn.clone(),
                    success: false,
                    output_path: output_path.clone(),
                    error: Some(error),
                },
            );
        }

        registry_handle.remove(&job_id_for_spawn).await;
    });

    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_media_job(
    registry: State<'_, JobRegistry>,
    job_id: String,
) -> Result<(), String> {
    let control = registry
        .get(&job_id)
        .await
        .ok_or_else(|| format!("Unknown job id: {job_id}"))?;

    control.cancelled.store(true, Ordering::SeqCst);
    control.cancel_notify.notify_waiters();
    Ok(())
}

impl JobRegistry {
    async fn insert(&self, job_id: String, control: Arc<JobControl>) -> Result<(), String> {
        let mut jobs = self.jobs.lock().await;
        if jobs.contains_key(&job_id) {
            return Err(format!("Job already exists: {job_id}"));
        }

        jobs.insert(job_id, control);
        Ok(())
    }

    async fn get(&self, job_id: &str) -> Option<Arc<JobControl>> {
        let jobs = self.jobs.lock().await;
        jobs.get(job_id).cloned()
    }

    async fn remove(&self, job_id: &str) {
        let mut jobs = self.jobs.lock().await;
        jobs.remove(job_id);
    }
}

async fn execute_media_job(
    app: AppHandle,
    control: Arc<JobControl>,
    request: MediaJobRequest,
) -> Result<(), String> {
    let MediaJobRequest { job_id, workflow } = request;
    let output_path = workflow_output_path(&workflow).map(ToOwned::to_owned);
    let total_duration = estimate_duration_seconds(&workflow).await.unwrap_or(None);
    let plan = build_command_plan(&workflow, &job_id)?;

    emit_progress(
        &app,
        &job_id,
        Some("Starting"),
        None,
        None,
        None,
        None,
        None,
    )?;

    let mut command = Command::new(tool_path(FFMPEG_ENV_NAME, "ffmpeg"));
    command.args(&plan.args);
    command.stderr(Stdio::piped());
    command.stdout(Stdio::null());

    for cleanup_file in &plan.cleanup_files {
        if let Some(parent) = cleanup_file.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to prepare temp directory: {e}"))?;
        }
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {e}"))?;

    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "ffmpeg stderr was not available".to_string())?;
    let mut lines = BufReader::new(stderr).lines();
    let mut cancelled = false;
    let mut last_stderr_line: Option<String> = None;

    loop {
        tokio::select! {
            line = lines.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        last_stderr_line = Some(line.clone());
                        if let Some(progress) = parse_progress_line(&line, total_duration) {
                            emit_progress(
                                &app,
                                &job_id,
                                Some("Processing"),
                                progress.progress_percent,
                                progress.time_seconds,
                                progress.fps,
                                progress.speed,
                                progress.eta_seconds,
                            )?;
                        }
                    }
                    Ok(None) => break,
                    Err(err) => {
                        last_stderr_line = Some(err.to_string());
                        break;
                    }
                }
            }
            _ = control.cancel_notify.notified(), if !cancelled => {
                cancelled = true;
                let _ = child.start_kill();
                break;
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait on ffmpeg: {e}"))?;

    for cleanup_file in plan.cleanup_files {
        let _ = fs::remove_file(cleanup_file);
    }

    if cancelled || control.cancelled.load(Ordering::SeqCst) {
        return Err("Job cancelled".to_string());
    }

    if status.success() {
        emit_complete(&app, &job_id, true, output_path.as_ref(), None)?;
        return Ok(());
    }

    let error = last_stderr_line.unwrap_or_else(|| format!("ffmpeg exited with status {status}"));
    Err(error)
}

fn build_command_plan(workflow: &MediaJobWorkflow, job_id: &str) -> Result<CommandPlan, String> {
    let plan = match workflow {
        MediaJobWorkflow::Convert(request) => build_convert_plan(request)?,
        MediaJobWorkflow::Trim(request) => build_trim_plan(request)?,
        MediaJobWorkflow::Compress(request) => build_compress_plan(request)?,
        MediaJobWorkflow::Merge(request) => build_merge_plan(request, job_id)?,
        MediaJobWorkflow::ExtractAudio(request) => build_extract_audio_plan(request)?,
        MediaJobWorkflow::Subtitles(request) => build_subtitles_plan(request)?,
    };

    ensure_parent_dir(
        workflow_output_path(workflow).ok_or_else(|| "Missing output path".to_string())?,
    )?;
    Ok(plan)
}

fn workflow_output_path(workflow: &MediaJobWorkflow) -> Option<&str> {
    match workflow {
        MediaJobWorkflow::Convert(request) => Some(request.output_path.as_str()),
        MediaJobWorkflow::Trim(request) => Some(request.output_path.as_str()),
        MediaJobWorkflow::Compress(request) => Some(request.output_path.as_str()),
        MediaJobWorkflow::Merge(request) => Some(request.output_path.as_str()),
        MediaJobWorkflow::ExtractAudio(request) => Some(request.output_path.as_str()),
        MediaJobWorkflow::Subtitles(request) => Some(request.output_path.as_str()),
    }
}

async fn estimate_duration_seconds(workflow: &MediaJobWorkflow) -> Result<Option<f64>, String> {
    match workflow {
        MediaJobWorkflow::Convert(request) => {
            probe_duration_seconds(Path::new(&request.input_path)).await
        }
        MediaJobWorkflow::Trim(request) => {
            probe_duration_seconds(Path::new(&request.input_path)).await
        }
        MediaJobWorkflow::Compress(request) => {
            probe_duration_seconds(Path::new(&request.input_path)).await
        }
        MediaJobWorkflow::ExtractAudio(request) => {
            probe_duration_seconds(Path::new(&request.input_path)).await
        }
        MediaJobWorkflow::Subtitles(request) => {
            probe_duration_seconds(Path::new(&request.input_path)).await
        }
        MediaJobWorkflow::Merge(request) => {
            let mut total = 0.0;
            let mut saw_value = false;

            for input in &request.input_paths {
                if let Some(duration) = probe_duration_seconds(Path::new(input)).await? {
                    saw_value = true;
                    total += duration;
                }
            }

            Ok(if saw_value { Some(total) } else { None })
        }
    }
}

fn build_convert_plan(request: &ConvertJobRequest) -> Result<CommandPlan, String> {
    let input = Path::new(&request.input_path);
    let output = Path::new(&request.output_path);
    let output_ext = normalized_extension(output);
    let flavor = detect_media_flavor(input);

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        request.input_path.clone(),
    ];
    args.push("-map".to_string());
    args.push("0".to_string());

    match flavor {
        MediaFlavor::AudioOnly => {
            args.push("-vn".to_string());
            let codec = request
                .audio_codec
                .clone()
                .or_else(|| audio_codec_for_extension(&output_ext).map(ToOwned::to_owned))
                .unwrap_or_else(|| "aac".to_string());
            args.extend(["-c:a".to_string(), codec]);
        }
        _ => {
            let video_codec = request
                .video_codec
                .clone()
                .unwrap_or_else(|| "libx264".to_string());
            let audio_codec = request
                .audio_codec
                .clone()
                .unwrap_or_else(|| "aac".to_string());
            let subtitle_codec = request
                .subtitle_codec
                .clone()
                .unwrap_or_else(|| subtitle_codec_for_extension(&output_ext).to_string());

            args.extend([
                "-c:v".to_string(),
                video_codec,
                "-c:a".to_string(),
                audio_codec,
            ]);
            args.extend(["-c:s".to_string(), subtitle_codec]);

            if matches!(output_ext.as_str(), "mp4" | "mov" | "m4v") {
                args.extend(["-movflags".to_string(), "+faststart".to_string()]);
            }
        }
    }

    args.extend(request.extra_args.iter().cloned());
    args.push(request.output_path.clone());

    Ok(CommandPlan {
        args,
        cleanup_files: Vec::new(),
    })
}

fn build_trim_plan(request: &TrimJobRequest) -> Result<CommandPlan, String> {
    let mut args = vec![
        "-y".to_string(),
        "-ss".to_string(),
        format!("{}", request.start_seconds),
        "-i".to_string(),
        request.input_path.clone(),
        "-map".to_string(),
        "0".to_string(),
    ];

    if let Some(end_seconds) = request.end_seconds {
        let duration = (end_seconds - request.start_seconds).max(0.0);
        args.extend(["-t".to_string(), format!("{duration}")]);
    }

    if request.reencode {
        let flavor = detect_media_flavor(Path::new(&request.input_path));
        if matches!(flavor, MediaFlavor::AudioOnly) {
            args.extend(["-c:a".to_string(), "aac".to_string()]);
        } else {
            args.extend([
                "-c:v".to_string(),
                "libx264".to_string(),
                "-c:a".to_string(),
                "aac".to_string(),
            ]);
        }
    } else {
        args.extend(["-c".to_string(), "copy".to_string()]);
    }

    args.push(request.output_path.clone());

    Ok(CommandPlan {
        args,
        cleanup_files: Vec::new(),
    })
}

fn build_compress_plan(request: &CompressJobRequest) -> Result<CommandPlan, String> {
    let flavor = detect_media_flavor(Path::new(&request.input_path));
    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        request.input_path.clone(),
    ];
    args.push("-map".to_string());
    args.push("0".to_string());

    if matches!(flavor, MediaFlavor::AudioOnly) {
        args.extend([
            "-vn".to_string(),
            "-c:a".to_string(),
            "aac".to_string(),
            "-b:a".to_string(),
            request
                .audio_bitrate
                .clone()
                .unwrap_or_else(|| quality_to_audio_bitrate(request.quality)),
        ]);
    } else {
        let crf = quality_to_crf(request.quality);
        args.extend([
            "-c:v".to_string(),
            "libx264".to_string(),
            "-crf".to_string(),
            crf.to_string(),
        ]);

        if let Some(preset) = &request.preset {
            args.extend(["-preset".to_string(), preset.clone()]);
        } else {
            args.extend(["-preset".to_string(), "medium".to_string()]);
        }

        args.extend([
            "-c:a".to_string(),
            "aac".to_string(),
            "-b:a".to_string(),
            request
                .audio_bitrate
                .clone()
                .unwrap_or_else(|| "128k".to_string()),
        ]);
    }

    args.push(request.output_path.clone());

    Ok(CommandPlan {
        args,
        cleanup_files: Vec::new(),
    })
}

fn build_merge_plan(request: &MergeJobRequest, job_id: &str) -> Result<CommandPlan, String> {
    if request.input_paths.len() < 2 {
        return Err("Merge requires at least two input files".to_string());
    }

    let list_path = std::env::temp_dir().join(format!("muvlo-merge-{job_id}.txt"));
    let mut list_contents = String::new();

    for input in &request.input_paths {
        list_contents.push_str(&format!("file {}\n", concat_list_entry(Path::new(input))));
    }

    fs::write(&list_path, list_contents)
        .map_err(|e| format!("Failed to write concat list file: {e}"))?;

    let args = vec![
        "-y".to_string(),
        "-f".to_string(),
        "concat".to_string(),
        "-safe".to_string(),
        "0".to_string(),
        "-i".to_string(),
        list_path.to_string_lossy().to_string(),
        "-c".to_string(),
        "copy".to_string(),
        request.output_path.clone(),
    ];

    Ok(CommandPlan {
        args,
        cleanup_files: vec![list_path],
    })
}

fn build_extract_audio_plan(request: &ExtractAudioJobRequest) -> Result<CommandPlan, String> {
    let codec = audio_codec_for_format(&request.format).unwrap_or("aac");

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        request.input_path.clone(),
        "-vn".to_string(),
        "-map".to_string(),
        "0:a:0".to_string(),
        "-c:a".to_string(),
        codec.to_string(),
    ];

    if let Some(bitrate) = &request.bitrate {
        args.extend(["-b:a".to_string(), bitrate.clone()]);
    }

    args.push(request.output_path.clone());

    Ok(CommandPlan {
        args,
        cleanup_files: Vec::new(),
    })
}

fn build_subtitles_plan(request: &SubtitlesJobRequest) -> Result<CommandPlan, String> {
    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        request.input_path.clone(),
    ];

    if request.burn_in {
        let filter = format!(
            "subtitles={}",
            concat_list_entry(Path::new(&request.subtitle_path))
        );
        args.extend([
            "-vf".to_string(),
            filter,
            "-c:v".to_string(),
            "libx264".to_string(),
            "-c:a".to_string(),
            "aac".to_string(),
        ]);
    } else {
        let subtitle_codec =
            subtitle_codec_for_extension(&normalized_extension(Path::new(&request.output_path)));
        args.extend([
            "-c:v".to_string(),
            "copy".to_string(),
            "-c:a".to_string(),
            "copy".to_string(),
            "-c:s".to_string(),
            subtitle_codec.to_string(),
        ]);
    }

    args.push(request.output_path.clone());

    Ok(CommandPlan {
        args,
        cleanup_files: Vec::new(),
    })
}

fn detect_media_flavor(path: &Path) -> MediaFlavor {
    match futures_lite_probe(path) {
        Some(true) => MediaFlavor::Video,
        Some(false) => MediaFlavor::AudioOnly,
        None => MediaFlavor::Unknown,
    }
}

fn futures_lite_probe(path: &Path) -> Option<bool> {
    let path_string = path.to_string_lossy().to_string();

    if let Ok(output) = std::process::Command::new(tool_path(FFPROBE_ENV_NAME, "ffprobe"))
        .args([
            "-v",
            "quiet",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=index",
            "-of",
            "csv=p=0",
            &path_string,
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Some(!stdout.trim().is_empty());
        }
    }

    None
}

fn normalized_extension(path: &Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .unwrap_or_default()
}

fn audio_codec_for_format(format: &AudioFormat) -> Option<&'static str> {
    match format {
        AudioFormat::Mp3 => Some("libmp3lame"),
        AudioFormat::Aac => Some("aac"),
        AudioFormat::Wav => Some("pcm_s16le"),
        AudioFormat::Flac => Some("flac"),
        AudioFormat::Ogg => Some("libvorbis"),
    }
}

fn audio_codec_for_extension(ext: &str) -> Option<&'static str> {
    match ext {
        "mp3" => Some("libmp3lame"),
        "aac" => Some("aac"),
        "wav" => Some("pcm_s16le"),
        "flac" => Some("flac"),
        "ogg" => Some("libvorbis"),
        _ => None,
    }
}

fn subtitle_codec_for_extension(ext: &str) -> &'static str {
    match ext {
        "mp4" | "mov" | "m4v" => "mov_text",
        _ => "copy",
    }
}

fn quality_to_crf(quality: u8) -> u8 {
    let quality = quality.min(100);
    let crf = 28.0 - ((quality as f64 / 100.0) * 10.0);
    crf.round().clamp(18.0, 28.0) as u8
}

fn quality_to_audio_bitrate(quality: u8) -> String {
    let quality = quality.min(100);
    let kbps = 64.0 + ((quality as f64 / 100.0) * 256.0);
    format!("{}k", kbps.round() as u32)
}

fn concat_list_entry(path: &Path) -> String {
    let normalized = path
        .to_string_lossy()
        .replace('\\', "/")
        .replace('\'', "\\'");
    format!("'{}'", normalized)
}

fn file_metadata(path: &Path) -> Result<SelectedFile, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file metadata for {}: {e}", path.display()))?;

    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string();

    Ok(SelectedFile {
        path: path.to_string_lossy().to_string(),
        name,
        size_bytes: metadata.len(),
    })
}

fn ensure_parent_dir(output_path: &str) -> Result<(), String> {
    let path = Path::new(output_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create output directory {}: {e}",
                parent.display()
            )
        })?;
    }

    Ok(())
}

fn validate_job_id(job_id: &str) -> Result<(), String> {
    if job_id.trim().is_empty() {
        return Err("job_id cannot be empty".to_string());
    }
    Ok(())
}

fn parse_progress_line(
    line: &str,
    total_duration_seconds: Option<f64>,
) -> Option<JobProgressEvent> {
    let metrics = parse_ffmpeg_metrics(line)?;
    let progress_percent = total_duration_seconds
        .filter(|duration| *duration > 0.0)
        .map(|duration| ((metrics.time_seconds / duration) * 100.0).clamp(0.0, 100.0));
    let eta_seconds = match (total_duration_seconds, metrics.speed) {
        (Some(total), Some(speed)) if speed > 0.0 => {
            Some(((total - metrics.time_seconds).max(0.0)) / speed)
        }
        _ => None,
    };

    Some(JobProgressEvent {
        job_id: String::new(),
        phase: Some("running".to_string()),
        progress_percent,
        time_seconds: Some(metrics.time_seconds),
        fps: metrics.fps,
        speed: metrics.speed,
        eta_seconds,
    })
}

struct ParsedMetrics {
    time_seconds: f64,
    fps: Option<f64>,
    speed: Option<f64>,
}

fn parse_ffmpeg_metrics(line: &str) -> Option<ParsedMetrics> {
    let time_regex = time_regex();
    let captures = time_regex.captures(line)?;
    let hours: f64 = captures.get(1)?.as_str().parse().ok()?;
    let minutes: f64 = captures.get(2)?.as_str().parse().ok()?;
    let seconds: f64 = captures.get(3)?.as_str().parse().ok()?;
    let time_seconds = hours * 3600.0 + minutes * 60.0 + seconds;

    Some(ParsedMetrics {
        time_seconds,
        fps: parse_float_field(line, fps_regex()),
        speed: parse_float_field(line, speed_regex()),
    })
}

fn parse_float_field(line: &str, regex: &Regex) -> Option<f64> {
    let captures = regex.captures(line)?;
    captures.get(1)?.as_str().trim().parse().ok()
}

fn time_regex() -> &'static Regex {
    static TIME_RE: OnceLock<Regex> = OnceLock::new();
    TIME_RE
        .get_or_init(|| Regex::new(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)").expect("valid time regex"))
}

fn fps_regex() -> &'static Regex {
    static FPS_RE: OnceLock<Regex> = OnceLock::new();
    FPS_RE.get_or_init(|| Regex::new(r"fps=\s*([\d.]+)").expect("valid fps regex"))
}

fn speed_regex() -> &'static Regex {
    static SPEED_RE: OnceLock<Regex> = OnceLock::new();
    SPEED_RE.get_or_init(|| Regex::new(r"speed=\s*([\d.]+)x").expect("valid speed regex"))
}

fn emit_progress(
    app: &AppHandle,
    job_id: &str,
    phase: Option<&str>,
    progress_percent: Option<f64>,
    time_seconds: Option<f64>,
    fps: Option<f64>,
    speed: Option<f64>,
    eta_seconds: Option<f64>,
) -> Result<(), String> {
    app.emit(
        JOB_PROGRESS_EVENT,
        JobProgressEvent {
            job_id: job_id.to_string(),
            phase: phase.map(|value| value.to_string()),
            progress_percent,
            time_seconds,
            fps,
            speed,
            eta_seconds,
        },
    )
    .map_err(|e| format!("Failed to emit job progress: {e}"))
}

fn emit_complete(
    app: &AppHandle,
    job_id: &str,
    success: bool,
    output_path: Option<&String>,
    error: Option<String>,
) -> Result<(), String> {
    app.emit(
        JOB_COMPLETE_EVENT,
        JobCompleteEvent {
            job_id: job_id.to_string(),
            success,
            output_path: output_path.cloned(),
            error,
        },
    )
    .map_err(|e| format!("Failed to emit job complete event: {e}"))
}

async fn tool_available(env_name: &str, default: &str) -> bool {
    Command::new(tool_path(env_name, default))
        .arg("-version")
        .output()
        .await
        .map(|output| output.status.success())
        .unwrap_or(false)
}

async fn tool_version(env_name: &str, default: &str) -> Option<String> {
    let output = Command::new(tool_path(env_name, default))
        .arg("-version")
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8(output.stdout)
        .ok()
        .and_then(|stdout| stdout.lines().next().map(|line| line.trim().to_string()))
}

fn tool_path(env_name: &str, default: &str) -> String {
    std::env::var(env_name).unwrap_or_else(|_| default.to_string())
}

fn resolve_bundled_tool_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    relative_path: &'static str,
) -> Option<String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let resource_path = resource_dir.join(relative_path);
        if resource_path.is_file() {
            return Some(resource_path.to_string_lossy().to_string());
        }
    }

    if cfg!(debug_assertions) {
        let dev_path = Path::new(env!("CARGO_MANIFEST_DIR")).join(relative_path);
        if dev_path.is_file() {
            return Some(dev_path.to_string_lossy().to_string());
        }
    }

    None
}

fn ffmpeg_resource_relative_path(tool: &str) -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH, tool) {
        ("windows", "x86_64", "ffmpeg") => "bin/win-x64/ffmpeg.exe",
        ("windows", "x86_64", "ffprobe") => "bin/win-x64/ffprobe.exe",
        ("windows", _, "ffmpeg") => "bin/win-x64/ffmpeg.exe",
        ("windows", _, "ffprobe") => "bin/win-x64/ffprobe.exe",
        ("macos", "aarch64", "ffmpeg") => "bin/macos-aarch64/ffmpeg",
        ("macos", "aarch64", "ffprobe") => "bin/macos-aarch64/ffprobe",
        ("macos", "x86_64", "ffmpeg") => "bin/macos-x64/ffmpeg",
        ("macos", "x86_64", "ffprobe") => "bin/macos-x64/ffprobe",
        ("linux", "x86_64", "ffmpeg") => "bin/linux-x64/ffmpeg",
        ("linux", "x86_64", "ffprobe") => "bin/linux-x64/ffprobe",
        (_, _, "ffmpeg") => "ffmpeg",
        (_, _, "ffprobe") => "ffprobe",
        _ => "ffmpeg",
    }
}

fn default_quality() -> u8 {
    70
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quality_maps_to_crf_range() {
        assert_eq!(quality_to_crf(0), 28);
        assert_eq!(quality_to_crf(100), 18);
    }

    #[test]
    fn concat_paths_are_escaped() {
        let entry = concat_list_entry(Path::new("C:\\foo\\bar's clip.mp4"));
        assert!(entry.starts_with('\''));
        assert!(entry.contains("\\'"));
    }

    #[test]
    fn parses_ffmpeg_metrics() {
        let line = "frame=  123 fps= 29.97 q=-1.0 size=    1024kB time=00:00:04.12 bitrate=2034.1kbits/s speed=1.01x";
        let metrics = parse_ffmpeg_metrics(line).expect("metrics");
        assert!((metrics.time_seconds - 4.12).abs() < 0.01);
        assert!((metrics.fps.unwrap() - 29.97).abs() < 0.01);
        assert!((metrics.speed.unwrap() - 1.01).abs() < 0.01);
    }
}
