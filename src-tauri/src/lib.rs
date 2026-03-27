pub mod ffmpeg;
pub mod probe;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ffmpeg::JobRegistry::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ffmpeg::pick_input_files,
            ffmpeg::pick_output_path,
            ffmpeg::get_media_tool_status,
            ffmpeg::start_media_job,
            ffmpeg::cancel_media_job,
            probe::get_media_info,
            probe::get_ffprobe_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
