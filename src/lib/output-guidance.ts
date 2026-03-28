import { formatDuration, formatFileSize, getMediaDurationSeconds, getPreferredOutputExtension } from "./media-helpers";
import type { MediaInfo, SelectedFile } from "./media-types";

type CompatibilityValue = "Yes" | "Maybe" | "No";

export interface ExportGuidance {
  sourceSizeLabel: string;
  estimatedSizeLabel: string;
  durationLabel: string;
  resolutionLabel: string;
  codecLabel: string;
  compatibility: {
    iphone: CompatibilityValue;
    web: CompatibilityValue;
    tv: CompatibilityValue;
  };
  estimateNote: string;
}

interface GuidanceOptions {
  file: Pick<SelectedFile, "size" | "kind" | "extension"> & { mediaInfo?: MediaInfo | null };
  format: string;
  outputKind: "video" | "audio";
  durationOverrideSeconds?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  videoBitrateMbps?: number;
  audioBitrateKbps?: number;
  maxWidth?: number;
}

export function buildOutputGuidance({
  file,
  format,
  outputKind,
  durationOverrideSeconds,
  videoCodec,
  audioCodec,
  videoBitrateMbps,
  audioBitrateKbps,
  maxWidth,
}: GuidanceOptions): ExportGuidance {
  const durationSeconds = durationOverrideSeconds ?? getMediaDurationSeconds(file.mediaInfo) ?? null;
  const estimatedSizeBytes = estimateOutputSizeBytes({
    file,
    format,
    outputKind,
    durationSeconds,
    videoCodec,
    audioCodec,
    videoBitrateMbps,
    audioBitrateKbps,
  });

  return {
    sourceSizeLabel: formatFileSize(file.size ?? null),
    estimatedSizeLabel: formatFileSize(estimatedSizeBytes),
    durationLabel: formatDuration(durationSeconds),
    resolutionLabel: describeResolution(file.mediaInfo, outputKind, maxWidth),
    codecLabel: describeCodecs(format, outputKind, videoCodec, audioCodec),
    compatibility: compatibilityForFormat(format, outputKind),
    estimateNote:
      durationSeconds == null
        ? "Estimate improves after media metadata loads."
        : estimateNoteForFormat(format, outputKind, videoBitrateMbps, audioBitrateKbps),
  };
}

function estimateOutputSizeBytes({
  file,
  format,
  outputKind,
  durationSeconds,
  videoCodec,
  audioCodec,
  videoBitrateMbps,
  audioBitrateKbps,
}: {
  file: Pick<SelectedFile, "size"> & { mediaInfo?: MediaInfo | null };
  format: string;
  outputKind: "video" | "audio";
  durationSeconds: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  videoBitrateMbps?: number;
  audioBitrateKbps?: number;
}) {
  if (durationSeconds == null || durationSeconds <= 0) {
    return null;
  }

  const normalizedFormat = getPreferredOutputExtension(format);
  const sourceBitrate = getSourceBitrateBitsPerSecond(file.mediaInfo);

  if (outputKind === "video" && normalizedFormat === "gif") {
    return estimateGifSizeBytes(file.mediaInfo, durationSeconds, file.size ?? null);
  }

  const requestedBitrate =
    outputKind === "audio"
      ? resolveAudioBitrateKbps(normalizedFormat, audioCodec, audioBitrateKbps, sourceBitrate) * 1000
      : resolveVideoTotalBitrateBitsPerSecond({
        mediaInfo: file.mediaInfo,
        format: normalizedFormat,
        videoCodec,
        audioCodec,
        videoBitrateMbps,
        audioBitrateKbps,
        sourceBitrate,
      });

  if (requestedBitrate != null) {
    return Math.max(Math.round((durationSeconds * requestedBitrate) / 8), 32 * 1024);
  }

  const sourceDuration = getMediaDurationSeconds(file.mediaInfo);
  if (file.size != null && sourceDuration != null && sourceDuration > 0) {
    return Math.max(Math.round(file.size * (durationSeconds / sourceDuration)), 32 * 1024);
  }

  return null;
}

function describeResolution(
  mediaInfo: MediaInfo | null | undefined,
  outputKind: "video" | "audio",
  maxWidth?: number,
) {
  if (outputKind === "audio") {
    return "Audio only";
  }

  const videoStream = mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  if (!videoStream?.width || !videoStream.height) {
    return maxWidth ? `Up to ${maxWidth}px wide` : "Match source";
  }

  if (!maxWidth || videoStream.width <= maxWidth) {
    return `${videoStream.width}x${videoStream.height}`;
  }

  const scaledHeight = Math.max(2, Math.round((videoStream.height / videoStream.width) * maxWidth / 2) * 2);
  return `${maxWidth}x${scaledHeight}`;
}

function describeCodecs(
  format: string,
  outputKind: "video" | "audio",
  videoCodec?: string | null,
  audioCodec?: string | null,
) {
  const normalizedFormat = getPreferredOutputExtension(format).toUpperCase();

  if (outputKind === "video" && normalizedFormat === "GIF") {
    return "GIF";
  }

  if (outputKind === "audio") {
    return `${normalizedFormat} | ${humanizeCodec(audioCodec, "audio")}`;
  }

  return `${normalizedFormat} | ${humanizeCodec(videoCodec, "video")} / ${humanizeCodec(audioCodec, "audio")}`;
}

function humanizeCodec(codec: string | null | undefined, kind: "video" | "audio") {
  switch (codec) {
    case "libx264":
      return "H.264";
    case "aac":
      return "AAC";
    case "libmp3lame":
      return "MP3";
    case "flac":
      return "FLAC";
    case "libvpx-vp9":
      return "VP9";
    default:
      if (codec) {
        return codec.toUpperCase();
      }

      return kind === "video" ? "Auto video" : "Auto audio";
  }
}

function compatibilityForFormat(format: string, outputKind: "video" | "audio"): ExportGuidance["compatibility"] {
  const normalized = getPreferredOutputExtension(format);

  if (outputKind === "audio") {
    if (normalized === "flac") {
      return { iphone: "Maybe", web: "Maybe", tv: "Maybe" };
    }

    return { iphone: "Yes", web: "Yes", tv: normalized === "ogg" ? "Maybe" : "Yes" };
  }

  if (normalized === "mkv") {
    return { iphone: "Maybe", web: "No", tv: "Maybe" };
  }

  if (normalized === "webm") {
    return { iphone: "Maybe", web: "Yes", tv: "Maybe" };
  }

  if (normalized === "gif") {
    return { iphone: "Maybe", web: "Yes", tv: "No" };
  }

  return { iphone: "Yes", web: "Yes", tv: "Yes" };
}

function estimateNoteForFormat(
  format: string,
  outputKind: "video" | "audio",
  videoBitrateMbps?: number,
  audioBitrateKbps?: number,
) {
  const normalized = getPreferredOutputExtension(format);

  if (normalized === "gif") {
    return "GIF exports are estimated heuristically and are often much larger than video files.";
  }

  if (outputKind === "audio" || videoBitrateMbps != null || audioBitrateKbps != null) {
    return "Estimated from clip length and current bitrate settings.";
  }

  return "Estimated from clip length, resolution, format defaults, and source bitrate when available.";
}

function resolveAudioBitrateKbps(
  format: string,
  audioCodec: string | null | undefined,
  requestedAudioBitrateKbps: number | undefined,
  sourceBitrate: number | null,
) {
  if (requestedAudioBitrateKbps != null) {
    return requestedAudioBitrateKbps;
  }

  if (format === "flac" || audioCodec === "flac") {
    if (sourceBitrate != null) {
      return Math.max(600, Math.round(sourceBitrate / 1000));
    }

    return 900;
  }

  if (format === "wav") {
    return 1411;
  }

  if (format === "aac") {
    return 160;
  }

  if (format === "ogg") {
    return 160;
  }

  return 192;
}

function resolveVideoTotalBitrateBitsPerSecond({
  mediaInfo,
  format,
  videoCodec,
  audioCodec,
  videoBitrateMbps,
  audioBitrateKbps,
  sourceBitrate,
}: {
  mediaInfo: MediaInfo | null | undefined;
  format: string;
  videoCodec?: string | null;
  audioCodec?: string | null;
  videoBitrateMbps?: number;
  audioBitrateKbps?: number;
  sourceBitrate: number | null;
}) {
  const resolvedAudioBitrateKbps = audioBitrateKbps ?? defaultAudioBitrateForVideoFormat(format, audioCodec);

  if (videoBitrateMbps != null) {
    return Math.round((videoBitrateMbps * 1_000_000) + (resolvedAudioBitrateKbps * 1000));
  }

  const scaledDefaultVideoBitrateMbps = defaultVideoBitrateForFormat(format, mediaInfo, videoCodec);
  let total = Math.round((scaledDefaultVideoBitrateMbps * 1_000_000) + (resolvedAudioBitrateKbps * 1000));

  if (sourceBitrate != null && sourceBitrate > 0) {
    total = Math.min(total, Math.round(sourceBitrate * 1.1));
    total = Math.max(total, Math.round(sourceBitrate * 0.35));
  }

  return total;
}

function defaultAudioBitrateForVideoFormat(format: string, audioCodec?: string | null) {
  if (audioCodec === "flac") {
    return 640;
  }

  if (format === "webm") {
    return 128;
  }

  if (format === "mov" || format === "mkv") {
    return 192;
  }

  return 160;
}

function defaultVideoBitrateForFormat(
  format: string,
  mediaInfo: MediaInfo | null | undefined,
  videoCodec?: string | null,
) {
  const baseMbps =
    format === "webm" || videoCodec === "libvpx-vp9"
      ? 4.5
      : format === "mov"
        ? 7
        : format === "mkv"
          ? 8
          : 6;

  const videoStream = mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const width = videoStream?.width ?? 1920;
  const height = videoStream?.height ?? 1080;
  const resolutionFactor = Math.sqrt((width * height) / (1920 * 1080));

  return Number(Math.max(1.8, baseMbps * resolutionFactor).toFixed(2));
}

function estimateGifSizeBytes(
  mediaInfo: MediaInfo | null | undefined,
  durationSeconds: number,
  sourceSize: number | null,
) {
  const videoStream = mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const width = videoStream?.width ?? 1280;
  const height = videoStream?.height ?? 720;
  const sourceFrameRate = parseFrameRateValue(videoStream?.avg_frame_rate);
  const effectiveFrameRate = Math.min(Math.max(sourceFrameRate ?? 12, 8), 15);
  const pixelRate = width * height * effectiveFrameRate * durationSeconds;
  let estimate = Math.round(pixelRate * 0.14);

  if (sourceSize != null) {
    estimate = Math.max(estimate, Math.round(sourceSize * 1.4));
    estimate = Math.min(estimate, Math.round(sourceSize * 12));
  }

  return Math.max(estimate, 256 * 1024);
}

function parseFrameRateValue(value?: string | null) {
  if (!value || value === "0/0") {
    return null;
  }

  const [numerator, denominator] = value.split("/");
  const numeratorValue = Number.parseFloat(numerator ?? "");
  const denominatorValue = Number.parseFloat(denominator ?? "");

  if (!Number.isFinite(numeratorValue) || !Number.isFinite(denominatorValue) || denominatorValue === 0) {
    return null;
  }

  const frameRate = numeratorValue / denominatorValue;
  return Number.isFinite(frameRate) && frameRate > 0 ? frameRate : null;
}

function getSourceBitrateBitsPerSecond(mediaInfo: MediaInfo | null | undefined) {
  const directBitrate = mediaInfo?.format.bit_rate ? Number.parseFloat(mediaInfo.format.bit_rate) : Number.NaN;
  if (Number.isFinite(directBitrate) && directBitrate > 0) {
    return directBitrate;
  }

  const size = mediaInfo?.format.size ? Number.parseFloat(mediaInfo.format.size) : Number.NaN;
  const duration = mediaInfo?.format.duration ? Number.parseFloat(mediaInfo.format.duration) : Number.NaN;
  if (Number.isFinite(size) && size > 0 && Number.isFinite(duration) && duration > 0) {
    return (size * 8) / duration;
  }

  return null;
}
