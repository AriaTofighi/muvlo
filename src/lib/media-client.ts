import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type {
  FileDialogFilter,
  JobCompleteEvent,
  JobProgressEvent,
  MediaInfo,
  MediaJobRequest,
  MediaToolStatus,
  SelectedFile,
} from "./media-types";

interface RawSelectedFile {
  path: string;
  name: string;
  sizeBytes: number;
}

type BackendMediaJobRequest =
  | {
      jobId: string;
      workflow: "convert";
      inputPath: string;
      outputPath: string;
      videoCodec?: string | null;
      audioCodec?: string | null;
      subtitleCodec?: string | null;
      extraArgs?: string[];
    }
  | {
      jobId: string;
      workflow: "trim";
      inputPath: string;
      outputPath: string;
      startSeconds: number;
      endSeconds?: number;
      reencode?: boolean;
    }
  | {
      jobId: string;
      workflow: "compress";
      inputPath: string;
      outputPath: string;
      quality: number;
      preset?: string | null;
      audioBitrate?: string | null;
    }
  | {
      jobId: string;
      workflow: "merge";
      inputPaths: string[];
      outputPath: string;
    }
  | {
      jobId: string;
      workflow: "extract_audio";
      inputPath: string;
      outputPath: string;
      format: string;
      bitrate?: string | null;
    }
  | {
      jobId: string;
      workflow: "subtitles";
      inputPath: string;
      subtitlePath: string;
      outputPath: string;
      burnIn: boolean;
    };

interface PickInputFilesArgs {
  multiple?: boolean;
  filters?: FileDialogFilter[];
}

interface PickOutputPathArgs {
  suggestedName?: string | null;
}

const TAURI_RUNTIME_ERROR =
  "Tauri runtime is not available. Start the app with `npm run tauri dev` or open the packaged desktop build.";

export function hasTauriRuntime() {
  return isTauri();
}

function ensureTauriRuntime() {
  if (!hasTauriRuntime()) {
    throw new Error(TAURI_RUNTIME_ERROR);
  }
}

export function pickInputFiles(args: PickInputFilesArgs = {}) {
  ensureTauriRuntime();

  return invoke<RawSelectedFile[]>("pick_input_files", {
    multiple: args.multiple ?? false,
    filters: args.filters ?? null,
  }).then((files) =>
    files.map((file) => ({
      path: file.path,
      name: file.name,
      size: file.sizeBytes,
      extension: file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? null : null,
      kind: inferMediaKind(file.name),
    })),
  );
}

function inferMediaKind(fileName: string): SelectedFile["kind"] {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";

  if (!extension) {
    return "unknown";
  }

  if (["srt", "vtt", "ass"].includes(extension)) {
    return "subtitle";
  }

  if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)) {
    return "audio";
  }

  if (["mp4", "mpg4", "mov", "mkv", "webm", "avi"].includes(extension)) {
    return "video";
  }

  return "unknown";
}

function toBackendRequest(request: MediaJobRequest): BackendMediaJobRequest {
  switch (request.payload.kind) {
    case "convert":
      return {
        jobId: request.jobId,
        workflow: "convert",
        inputPath: request.payload.inputPath,
        outputPath: request.payload.outputPath,
      };
    case "trim":
      return {
        jobId: request.jobId,
        workflow: "trim",
        inputPath: request.payload.inputPath,
        outputPath: request.payload.outputPath,
        startSeconds: request.payload.startSeconds,
        endSeconds: request.payload.endSeconds,
        reencode: false,
      };
    case "compress":
      return {
        jobId: request.jobId,
        workflow: "compress",
        inputPath: request.payload.inputPath,
        outputPath: request.payload.outputPath,
        quality: request.payload.quality,
      };
    case "merge":
      return {
        jobId: request.jobId,
        workflow: "merge",
        inputPaths: request.payload.inputPaths,
        outputPath: request.payload.outputPath,
      };
    case "extract_audio":
      return {
        jobId: request.jobId,
        workflow: "extract_audio",
        inputPath: request.payload.inputPath,
        outputPath: request.payload.outputPath,
        format: request.payload.format,
        bitrate: request.payload.bitrate,
      };
    case "subtitles":
      return {
        jobId: request.jobId,
        workflow: "subtitles",
        inputPath: request.payload.inputPath,
        subtitlePath: request.payload.subtitlePath,
        outputPath: request.payload.outputPath,
        burnIn: request.payload.mode === "hard",
      };
  }
}

export function startMediaJob(request: MediaJobRequest) {
  ensureTauriRuntime();
  return invoke<string>("start_media_job", { request: toBackendRequest(request) });
}

export function cancelMediaJob(jobId: string) {
  ensureTauriRuntime();
  return invoke<void>("cancel_media_job", { jobId });
}

export function listenToJobProgress(handler: (event: JobProgressEvent) => void): Promise<UnlistenFn> {
  ensureTauriRuntime();
  return listen<JobProgressEvent>("job-progress", (event) => {
    handler(event.payload);
  });
}

export function pickOutputPath(args: PickOutputPathArgs = {}) {
  ensureTauriRuntime();
  return invoke<string | null>("pick_output_path", {
    suggestedName: args.suggestedName ?? null,
  });
}

export function getMediaInfo(path: string) {
  ensureTauriRuntime();
  return invoke<MediaInfo>("get_media_info", { path });
}

export function getMediaToolStatus() {
  ensureTauriRuntime();
  return invoke<MediaToolStatus>("get_media_tool_status");
}

export function listenToJobComplete(handler: (event: JobCompleteEvent) => void): Promise<UnlistenFn> {
  ensureTauriRuntime();
  return listen<JobCompleteEvent>("job-complete", (event) => {
    handler(event.payload);
  });
}

export async function revealInExplorer(path: string) {
  ensureTauriRuntime();
  try {
    await revealItemInDir(path);
  } catch (error) {
    console.error("Failed to reveal item in folder:", error);
    throw error;
  }
}
