export type MediaKind = "video" | "audio" | "subtitle" | "image" | "unknown";

export interface SelectedFile {
  path: string;
  name: string;
  size: number | null;
  extension: string | null;
  kind: MediaKind;
}

export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

export interface MediaInfo {
  format: FormatInfo;
  streams: StreamInfo[];
}

export interface WaveformPreview {
  dataUrl: string | null;
}

export interface MediaToolStatus {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegVersion?: string | null;
  ffprobeVersion?: string | null;
}

export interface FormatInfo {
  default_val?: string | null;
  filename: string;
  format_name: string;
  duration?: string | null;
  size?: string | null;
  bit_rate?: string | null;
}

export interface StreamInfo {
  index: number;
  codec_name?: string | null;
  codec_type: string;
  width?: number | null;
  height?: number | null;
  avg_frame_rate?: string | null;
  sample_rate?: string | null;
  channels?: number | null;
}

export type WorkflowName =
  | "Convert"
  | "Trim"
  | "Compress"
  | "Merge"
  | "Extract Audio"
  | "Subtitles";

export interface ConvertJobPayload {
  kind: "convert";
  inputPath: string;
  outputPath: string;
  format: string;
  videoCodec?: string | null;
  audioCodec?: string | null;
  subtitleCodec?: string | null;
  extraArgs?: string[];
  overwrite?: boolean;
}

export interface TrimJobPayload {
  kind: "trim";
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  endSeconds: number;
  reencode?: boolean;
  videoCodec?: string | null;
  audioCodec?: string | null;
  extraArgs?: string[];
  dropVideo?: boolean;
  overwrite?: boolean;
}

export interface CompressJobPayload {
  kind: "compress";
  inputPath: string;
  outputPath: string;
  quality: number;
  overwrite?: boolean;
}

export interface MergeJobPayload {
  kind: "merge";
  inputPaths: string[];
  outputPath: string;
  overwrite?: boolean;
}

export interface ExtractAudioJobPayload {
  kind: "extract_audio";
  inputPath: string;
  outputPath: string;
  format: string;
  audioCodec?: string | null;
  bitrate?: string | null;
  overwrite?: boolean;
}

export interface SubtitlesJobPayload {
  kind: "subtitles";
  inputPath: string;
  subtitlePath: string;
  outputPath: string;
  mode: "soft" | "hard";
  overwrite?: boolean;
}

export type MediaJobPayload =
  | ConvertJobPayload
  | TrimJobPayload
  | CompressJobPayload
  | MergeJobPayload
  | ExtractAudioJobPayload
  | SubtitlesJobPayload;

export interface MediaJobRequest {
  jobId: string;
  payload: MediaJobPayload;
}

export interface JobProgressEvent {
  jobId: string;
  phase?: string | null;
  progressPercent?: number | null;
  timeSeconds?: number | null;
  fps?: number | null;
  speed?: number | null;
  etaSeconds?: number | null;
}

export interface JobCompleteEvent {
  jobId: string;
  success: boolean;
  outputPath?: string | null;
  error?: string | null;
}
