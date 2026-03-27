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

export const getDirectory = (path: string) => {
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (lastSlash === -1) return "";
  return path.substring(0, lastSlash);
};

export const getPathSeparator = (path: string) => {
  return path.includes("\\") ? "\\" : "/";
};

export const buildSuggestedOutputName = (
  file: SelectedFile,
  extension: string,
  suffix = "",
) => `${getBaseName(file.name)}${suffix}.${getPreferredOutputExtension(extension)}`;

export const buildDefaultOutputPath = (
  file: SelectedFile,
  extension: string,
  suffix = "",
) => {
  const dir = getDirectory(file.path);
  const sep = getPathSeparator(file.path);
  const name = buildSuggestedOutputName(file, extension, suffix);
  return dir ? `${dir}${sep}${name}` : name;
};

export const getPreferredOutputExtension = (extension: string | null | undefined) => {
  const normalized = extension?.toLowerCase() ?? "";

  if (normalized === "mpg4") {
    return "mp4";
  }

  return normalized || "mp4";
};

export const normalizeOutputPath = (outputPath: string) => {
  if (outputPath.toLowerCase().endsWith(".mpg4")) {
    return `${outputPath.slice(0, -5)}.mp4`;
  }

  return outputPath;
};

export const normalizeWorkflowOutputPath = (outputPath: string) => {
  const normalizedPath = normalizeOutputPath(outputPath);

  if (normalizedPath !== outputPath) {
    return {
      path: normalizedPath,
      changed: true,
      message: "Using `.mp4` because `.mpg4` is not a valid FFmpeg output container.",
    };
  }

  return {
    path: outputPath,
    changed: false,
    message: null,
  };
};

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
