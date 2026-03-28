import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Folder,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { OutputGuidanceCard } from "@/components/export/OutputGuidanceCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  VIDEO_AND_AUDIO_FILTERS,
  buildDefaultOutputPath,
  clampValue,
  formatDuration,
  formatPreciseDuration,
  getMediaDurationSeconds,
  parseFrameRate,
} from "@/lib/media-helpers";
import { getWaveformPreview, hasTauriRuntime, revealInExplorer } from "@/lib/media-client";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";
import { buildOutputGuidance } from "@/lib/output-guidance";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface QueuedClip {
  id: string;
  label: string;
  outputPath: string;
  startSeconds: number;
  endSeconds: number;
  jobId?: string;
}

export function Trim() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [range, setRange] = useState([0, 100]);
  const [waveformDataUrl, setWaveformDataUrl] = useState<string | null>(null);
  const [queuedClips, setQueuedClips] = useState<QueuedClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const durationSeconds = getMediaDurationSeconds(activeFile?.mediaInfo) ?? 0;
  const startSeconds = durationSeconds === 0 ? 0 : (range[0] / 100) * durationSeconds;
  const endSeconds = durationSeconds === 0 ? 0 : (range[1] / 100) * durationSeconds;
  const clipDuration = Math.max(0, endSeconds - startSeconds);
  const videoStream = activeFile?.mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const frameRate = parseFrameRate(videoStream?.avg_frame_rate) ?? 30;
  const frameDuration = 1 / frameRate;
  const currentFrame = Math.max(0, Math.round(currentTime * frameRate));
  const previewSrc = activeFile && hasTauriRuntime() ? convertFileSrc(activeFile.path) : null;

  useEffect(() => {
    setRange([0, 100]);
    setCurrentTime(0);
    setQueuedClips([]);
    setWaveformDataUrl(null);
    setIsPlaying(false);

    if (!activeFile) {
      return;
    }

    if (activeFile.kind === "video" || activeFile.kind === "audio") {
      if (hasTauriRuntime()) {
        void getWaveformPreview(activeFile.path)
          .then((preview) => {
            setWaveformDataUrl(preview.dataUrl ?? null);
          })
          .catch(() => {
            setWaveformDataUrl(null);
          });
      }
    }
  }, [activeFile]);

  const queueJobs = useMemo(() => {
    const map = new Map(jobs.map((job) => [job.id, job]));
    return map;
  }, [jobs]);

  const guidance = useMemo(() => {
    if (!activeFile || (activeFile.kind !== "video" && activeFile.kind !== "audio")) {
      return null;
    }

    return buildOutputGuidance({
      file: activeFile,
      format: activeFile.extension ?? (activeFile.kind === "audio" ? "mp3" : "mp4"),
      outputKind: activeFile.kind,
      durationOverrideSeconds: clipDuration || null,
    });
  }, [activeFile, clipDuration]);

  const selectionValid = Boolean(activeFile && clipDuration > 0.04);

  const syncRangeFromTimes = (nextStart: number, nextEnd: number) => {
    if (durationSeconds <= 0) {
      return;
    }

    const clampedStart = clampValue(nextStart, 0, durationSeconds);
    const clampedEnd = clampValue(nextEnd, clampedStart + 0.01, durationSeconds);
    setRange([
      (clampedStart / durationSeconds) * 100,
      (clampedEnd / durationSeconds) * 100,
    ]);
  };

  const seekTo = (seconds: number) => {
    const target = clampValue(seconds, 0, durationSeconds || 0);
    setCurrentTime(target);

    if (mediaRef.current) {
      mediaRef.current.currentTime = target;
    }
  };

  const togglePlayback = async () => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }

    if (media.paused) {
      try {
        await media.play();
      } catch {
        toast.error("Preview playback is unavailable for this file.");
      }
      return;
    }

    media.pause();
  };

  const setInPoint = () => {
    syncRangeFromTimes(currentTime, Math.max(currentTime + frameDuration, endSeconds));
  };

  const setOutPoint = () => {
    syncRangeFromTimes(startSeconds, Math.max(currentTime, startSeconds + frameDuration));
  };

  const stepByFrames = (direction: -1 | 1) => {
    const media = mediaRef.current;
    if (media) {
      media.pause();
    }

    seekTo(currentTime + direction * frameDuration);
  };

  const handleTimelineSeek = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || durationSeconds <= 0) {
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();
    const position = clampValue((event.clientX - rect.left) / rect.width, 0, 1);
    seekTo(position * durationSeconds);
  };

  const addClipToQueue = () => {
    if (!activeFile || !selectionValid) {
      toast.error("Choose a valid selection first.");
      return;
    }

    const nextIndex = queuedClips.length + 1;
    const label = `clip-${nextIndex.toString().padStart(2, "0")}`;
    const outputExtension = activeFile.extension ?? (activeFile.kind === "audio" ? "mp3" : "mp4");
    const outputPath = buildDefaultOutputPath(activeFile, outputExtension, `-${label}`);

    setQueuedClips((clips) => [
      ...clips,
      {
        id: crypto.randomUUID(),
        label,
        outputPath,
        startSeconds,
        endSeconds,
      },
    ]);

    toast.success("Clip added to export queue.");
  };

  const exportQueuedClips = async () => {
    if (!activeFile) {
      toast.error("Select a source file first.");
      return;
    }

    const pendingClips = queuedClips.filter((clip) => !clip.jobId);
    if (pendingClips.length === 0) {
      toast.error("Add at least one clip to the queue.");
      return;
    }

    for (const clip of pendingClips) {
      const request: MediaJobRequest = {
        jobId: crypto.randomUUID(),
        payload: {
          kind: "trim",
          inputPath: activeFile.path,
          outputPath: clip.outputPath,
          startSeconds: clip.startSeconds,
          endSeconds: clip.endSeconds,
          overwrite: true,
        },
      };

      enqueueJob({
        id: request.jobId,
        fileName: `${activeFile.name} - ${clip.label}`,
        workflow: "Trim",
        request,
      });

      setQueuedClips((clips) =>
        clips.map((item) =>
          item.id === clip.id
            ? {
                ...item,
                jobId: request.jobId,
              }
            : item,
        ),
      );

      await startJob(request.jobId);
    }

    toast.success(`Started export for ${pendingClips.length} queued clip${pendingClips.length === 1 ? "" : "s"}.`);
  };

  const removeClip = (clipId: string) => {
    setQueuedClips((clips) => clips.filter((clip) => clip.id !== clipId));
  };

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio");
    if (!sourceFile) {
      toast.error("Drop a video or audio file.");
      return;
    }

    await useWorkspaceStore.getState().selectActiveFile(sourceFile);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Trim</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile({ filters: VIDEO_AND_AUDIO_FILTERS }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        onRemoveSource={() => useWorkspaceStore.getState().clearActiveFile()}
        onDropSource={(files) => void handleDroppedSource(files)}
      />

      <Card>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-xl border bg-muted/20">
            {previewSrc ? (
              activeFile?.kind === "audio" ? (
                <div className="space-y-4 p-6">
                  <audio
                    ref={(node) => {
                      mediaRef.current = node;
                    }}
                    src={previewSrc}
                    controls
                    preload="metadata"
                    className="w-full"
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onLoadedMetadata={(event) => {
                      setCurrentTime(event.currentTarget.currentTime);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              ) : (
                <video
                  ref={(node) => {
                    mediaRef.current = node;
                  }}
                  src={previewSrc}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black object-contain"
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onLoadedMetadata={(event) => {
                    setCurrentTime(event.currentTarget.currentTime);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
                Load a file to preview it here.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void togglePlayback()} disabled={!previewSrc}>
              {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => stepByFrames(-1)} disabled={!previewSrc}>
              <SkipBack className="mr-2 h-4 w-4" /> Prev frame
            </Button>
            <Button variant="outline" size="sm" onClick={() => stepByFrames(1)} disabled={!previewSrc}>
              <SkipForward className="mr-2 h-4 w-4" /> Next frame
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="outline" size="sm" onClick={setInPoint} disabled={!previewSrc}>
              Mark in
            </Button>
            <Button variant="outline" size="sm" onClick={setOutPoint} disabled={!previewSrc}>
              Mark out
            </Button>
            <div className="ml-auto rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              Frame {currentFrame}
            </div>
          </div>

          <div
            ref={timelineRef}
            onClick={handleTimelineSeek}
            className="relative overflow-hidden rounded-xl border bg-card/40 p-4"
          >
            <div className="pointer-events-none absolute inset-y-4 rounded-lg bg-accent/10" style={{ left: `${range[0]}%`, right: `${100 - range[1]}%` }} />
            {waveformDataUrl ? (
              <img src={waveformDataUrl} alt="Audio waveform" className="h-28 w-full rounded-xl object-cover opacity-80" />
            ) : (
              <div className="h-28 rounded-xl bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.06)_25%,transparent_50%,rgba(255,255,255,0.06)_75%,transparent_100%)] bg-[length:24px_100%] bg-muted/40" />
            )}
            <div
              className="pointer-events-none absolute inset-y-4 w-px bg-accent shadow-[0_0_0_1px_hsl(var(--accent)/0.3)]"
              style={{ left: `${durationSeconds === 0 ? 0 : (currentTime / durationSeconds) * 100}%` }}
            />
            <div className="mt-4">
              <Slider
                value={range}
                max={100}
                step={0.1}
                minStepsBetweenValues={0.2}
                onValueChange={(value) => setRange(value as number[])}
                className="w-full"
                disabled={!activeFile || durationSeconds === 0}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-mono text-muted-foreground">In {formatPreciseDuration(startSeconds)}</span>
              <span className="text-xs text-muted-foreground">{formatDuration(clipDuration)}</span>
              <span className="font-mono text-muted-foreground">Out {formatPreciseDuration(endSeconds)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {guidance && <OutputGuidanceCard guidance={guidance} />}

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button onClick={addClipToQueue} disabled={!selectionValid}>
              <Plus className="mr-2 h-4 w-4" /> Add selection
            </Button>
            <Button variant="secondary" onClick={() => void exportQueuedClips()} disabled={queuedClips.length === 0}>
              <Scissors className="mr-2 h-4 w-4" /> Export queued clips
            </Button>
          </div>

          {queuedClips.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">No clips queued.</div>
          ) : (
            <div className="space-y-3">
              {queuedClips.map((clip) => {
                const job = clip.jobId ? queueJobs.get(clip.jobId) : null;

                return (
                  <div key={clip.id} className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{clip.label}</p>
                        <span className="text-sm text-muted-foreground">
                          {formatPreciseDuration(clip.startSeconds)} to {formatPreciseDuration(clip.endSeconds)}
                        </span>
                      </div>
                      <p className="truncate text-xs font-mono text-muted-foreground">{clip.outputPath}</p>
                      {job && (
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{job.phase ?? "Queued"}</span>
                            <span>{Math.round(job.progress)}%</span>
                          </div>
                          <Progress value={job.progress} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {job?.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!job) {
                              return;
                            }

                            void revealInExplorer(job.outputPath ?? clip.outputPath);
                          }}
                        >
                          <Folder className="mr-2 h-4 w-4" /> Open
                        </Button>
                      )}
                      {job?.status === "running" && clip.jobId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!clip.jobId) {
                              return;
                            }

                            void useJobStore.getState().cancelJob(clip.jobId);
                          }}
                        >
                          <Square className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      )}
                      {!job && (
                        <Button variant="ghost" size="sm" onClick={() => removeClip(clip.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
