# Muvlo 🌊

A sleek, open-source desktop application that provides a modern, intuitive UI on top of FFmpeg's powerful media processing engine. The name **Muvlo** ("move" + flow) reflects the app's goal: making media flow effortlessly.

Built with **Tauri v2**, **React**, **TypeScript**, and **shadcn/ui**.

## Features

- 🎨 **Cinematic UI**: A dark-first, beautiful interface with smooth micro-animations.
- ⚡ **Native Performance**: Powered by a Rust backend with extremely low memory usage.
- 🎬 **6 Core Workflows**:
  - **Convert**: Transcode video and audio formats.
  - **Trim**: Visually cut the start and end of videos without re-encoding.
  - **Compress**: Reduce file size using a simple quality slider.
  - **Merge**: Quickly join multiple clips via drag-and-drop.
  - **Extract Audio**: Pull high-quality audio tracks from video files.
  - **Subtitles**: Add soft or hardcoded subtitles.
- 🗂️ **Batch Processing**: Use the Job Queue to process multiple files in the background.
- 💾 **Presets**: Save, load, and share your favorite encoding profiles.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [FFmpeg](https://ffmpeg.org/download.html) (Ensure `ffmpeg` and `ffprobe` are in your system PATH)

### Quick Start
```bash
git clone https://github.com/yourusername/muvlo.git
cd muvlo
npm install
npm run tauri dev
```

## Architecture

Muvlo uses **Tauri v2** to bridge a React frontend and a Rust backend:
- The **Frontend** handles the complex drag-and-drop flows, timeline visualizations, and queue management using Zustand and shadcn/ui.
- The **Backend (Rust)** spawns asynchronous asynchronous `tokio` processes to run FFmpeg, parses the stderr output for progress (`time=XX:YY:ZZ`), and proxies these events back to the frontend.

## Roadmap
- [ ] Platform-specific native FFmpeg binary bundling
- [ ] Advanced visual timeline for the Trim mode
- [ ] Hardware acceleration (NVENC, VideoToolbox, QSV) toggle
- [ ] Auto-updater integration

## License

MIT License. See `LICENSE` for more information.
