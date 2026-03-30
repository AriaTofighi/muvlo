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
import { OutputGuidanceContent } from "@/components/export/OutputGuidanceContent";
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
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 will-change-[opacity] backface-hidden">
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

      <Card size="flush" className="overflow-hidden">
        <CardContent>
          <div className="space-y-6 p-[var(--surface-padding)]">
            <div className="overflow-hidden rounded-xl border bg-muted">
              {previewSrc ? (
                activeFile?.kind === "audio" ? (
                  <div className="space-y-4 p-[var(--surface-padding)]">
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
              <Button variant="outline" size="sm" onClick={() => void togglePlayback()} disabled={!previewSrc} className="h-8 font-semibold">
                {isPlaying ? <Pause className="mr-2 h-3 w-3 fill-current" /> : <Play className="mr-2 h-3 w-3 fill-current" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => stepByFrames(-1)} disabled={!previewSrc} className="h-8 font-semibold">
                <SkipBack className="mr-2 h-3 w-3 fill-current" /> Prev frame
              </Button>
              <Button variant="outline" size="sm" onClick={() => stepByFrames(1)} disabled={!previewSrc} className="h-8 font-semibold">
                <SkipForward className="mr-2 h-3 w-3 fill-current" /> Next frame
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="outline" size="sm" onClick={setInPoint} disabled={!previewSrc} className="h-8 font-semibold">
                Mark in
              </Button>
              <Button variant="outline" size="sm" onClick={setOutPoint} disabled={!previewSrc} className="h-8 font-semibold">
                Mark out
              </Button>
              <div className="ml-auto rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground tracking-tight">
                frame {currentFrame}
              </div>
            </div>

            <div
              ref={timelineRef}
              onClick={handleTimelineSeek}
              className="surface-inset relative overflow-hidden bg-card"
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-muted-foreground lowercase">
                <span className="rounded bg-muted px-2 py-0.5">in {formatPreciseDuration(startSeconds)}</span>
                <span className="text-foreground font-bold">{formatDuration(clipDuration)} selection</span>
                <span className="rounded bg-muted px-2 py-0.5">out {formatPreciseDuration(endSeconds)}</span>
              </div>
            </div>
          </div>

          {guidance && (
            <div className="border-t border-border bg-muted/50 p-[var(--surface-padding)]">
              <OutputGuidanceContent guidance={guidance} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="lg">
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button onClick={addClipToQueue} disabled={!selectionValid} className="font-semibold h-10 px-5 shadow-none">
              <Plus className="mr-2 h-4 w-4" /> Add selection
            </Button>
            <Button variant="secondary" onClick={() => void exportQueuedClips()} disabled={queuedClips.length === 0} className="font-semibold h-10 px-5 shadow-none border border-border/40">
              <Scissors className="mr-2 h-4 w-4" /> Export queued clips
            </Button>
          </div>

          {queuedClips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No clips queued. Add current selection to begin.</div>
          ) : (
            <div className="space-y-3">
              {queuedClips.map((clip) => {
                const job = clip.jobId ? queueJobs.get(clip.jobId) : null;

                return (
                  <div key={clip.id} className="surface-inset flex flex-col gap-3 transition-colors hover:border-border hover:bg-muted lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{clip.label}</p>
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold lowercase tracking-tight text-muted-foreground">
                          {formatPreciseDuration(clip.startSeconds)} to {formatPreciseDuration(clip.endSeconds)}
                        </span>
                      </div>
                      <p className="mt-0.8 truncate text-[10px] lowercase tracking-tight text-muted-foreground">{clip.outputPath}</p>
                      {job && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-[11px] font-bold lowercase tracking-tight text-muted-foreground">
                            <span>{job.phase?.toLowerCase() ?? "queued"}</span>
                            <span>{Math.round(job.progress)}%</span>
                          </div>
                          <Progress value={job.progress} className="h-1 bg-muted/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 lg:shrink-0">
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
                          className="h-8 text-xs font-semibold border-border/40 hover:border-success/30 hover:bg-success/5"
                        >
                          <Folder className="mr-2 h-3.5 w-3.5" /> Open
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
                          className="h-8 text-xs font-semibold"
                        >
                          <Square className="mr-2 h-3 w-3 fill-current" /> Cancel
                        </Button>
                      )}
                      {!job && (
                        <Button variant="ghost" size="icon" onClick={() => removeClip(clip.id)} className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Trash2 className="size-4" />
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
