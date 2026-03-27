import type { FileDialogFilter, MediaInfo, SelectedFile } from "./media-types";

export const MEDIA_FILTERS: FileDialogFilter[] = [
  { name: "Media", extensions: ["mp4", "mpg4", "mov", "mkv", "webm", "avi", "mp3", "wav", "flac", "aac", "ogg"] },
];

export const VIDEO_FILTERS: FileDialogFilter[] = [
  { name: "Video", extensions: ["mp4", "mpg4", "mov", "mkv", "webm", "avi"] },
];

export const AUDIO_FILTERS: FileDialogFilter[] = [
  { name: "Audio", extensions: ["mp3", "wav", "flac", "aac", "ogg", "m4a"] },
];

export const SUBTITLE_FILTERS: FileDialogFilter[] = [
  { name: "Subtitles", extensions: ["srt", "vtt", "ass"] },
];

export const formatFileSize = (size: number | null) => {
  if (size == null) {
    return "Unknown size";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const getBaseName = (fileName: string) => {
  const segments = fileName.split(".");
  if (segments.length <= 1) {
    return fileName;
  }

  segments.pop();
  return segments.join(".");
};

export const buildSuggestedOutputName = (
  file: SelectedFile,
  extension: string,
  suffix = "",
) => `${getBaseName(file.name)}${suffix}.${extension}`;

export const getMediaDurationSeconds = (mediaInfo?: MediaInfo | null) => {
  const durationString = mediaInfo?.format.duration;
  if (!durationString) {
    return null;
  }

  const parsedDuration = Number.parseFloat(durationString);
  return Number.isFinite(parsedDuration) ? parsedDuration : null;
};

export const formatDuration = (seconds: number | null) => {
  if (seconds == null || Number.isNaN(seconds)) {
    return "--:--";
  }

  const wholeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};
