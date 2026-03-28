import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Folder, Play, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { OutputGuidanceCard } from "@/components/export/OutputGuidanceCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import { pickOutputPath, revealInExplorer } from "@/lib/media-client";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";
import { buildOutputGuidance } from "@/lib/output-guidance";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Convert() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob, cancelJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [format, setFormat] = useState("mp4");
  const [outputPath, setOutputPath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [videoCodec, setVideoCodec] = useState("");
  const [audioCodec, setAudioCodec] = useState("");
  const [videoBitrate, setVideoBitrate] = useState("");
  const [audioBitrate, setAudioBitrate] = useState("");
  const [maxWidth, setMaxWidth] = useState("");

  const outputKind =
    activeFile?.kind === "audio"
      ? "audio"
      : activeFile?.kind === "video"
        ? "video"
        : null;

  const VIDEO_FORMATS = ["mp4", "mov", "mkv", "webm", "gif"];
  const AUDIO_FORMATS = ["mp3", "aac", "wav", "flac", "ogg"];
  const IMAGE_FORMATS = ["webp", "jpg", "png", "avif", "gif"];

  const availableFormats = useMemo(() => {
    if (activeFile?.kind === "audio") return AUDIO_FORMATS;
    if (activeFile?.kind === "image") return IMAGE_FORMATS;
    return VIDEO_FORMATS;
  }, [activeFile?.kind]);

  useEffect(() => {
    if (!activeFile) {
      setFormat("mp4");
      setOutputPath("");
      setVideoCodec("");
      setAudioCodec("");
      setVideoBitrate("");
      setAudioBitrate("");
      setMaxWidth("");
      return;
    }

    if (activeFile.kind === "video") {
      setFormat("mp4");
      setOutputPath(buildDefaultOutputPath(activeFile, "mp4", "-converted"));
    } else if (activeFile.kind === "audio") {
      setFormat("mp3");
      setOutputPath(buildDefaultOutputPath(activeFile, "mp3", "-converted"));
    } else {
      const nextFormat = activeFile.kind === "image" ? "webp" : "mp4";
      setFormat(nextFormat);
      setOutputPath(buildDefaultOutputPath(activeFile, nextFormat, "-converted"));
    }

    setVideoCodec("");
    setAudioCodec("");
    setVideoBitrate("");
    setAudioBitrate("");
    setMaxWidth("");
  }, [activeFile]);

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find(
          (job) =>
            job.workflow === "Convert" &&
            "inputPath" in job.request.payload &&
            job.request.payload.inputPath === activeFile?.path,
        ),
    [activeFile?.path, jobs],
  );

  const guidance = useMemo(() => {
    if (!activeFile || outputKind == null) {
      return null;
    }

    return buildOutputGuidance({
      file: activeFile,
      format,
      outputKind,
      videoCodec,
      audioCodec,
      videoBitrateMbps: parseOptionalNumber(videoBitrate),
      audioBitrateKbps: parseOptionalInt(audioBitrate),
      maxWidth: parseOptionalInt(maxWidth),
    });
  }, [activeFile, audioBitrate, audioCodec, format, maxWidth, outputKind, videoBitrate, videoCodec]);

  const handleChooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a source file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, format, "-converted"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const handleFormatChange = (nextFormat: string) => {
    setFormat(nextFormat);
    setVideoCodec("");
    setAudioCodec("");
    setVideoBitrate("");
    setAudioBitrate("");
    setMaxWidth("");

    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, nextFormat, "-converted"));
    }
  };

  const startConversion = async () => {
    if (!activeFile || !outputPath) {
      toast.error("Select a source file and output path first.");
      return;
    }

    const normalizedOutput = normalizeWorkflowOutputPath(outputPath);
    if (normalizedOutput.changed) {
      setOutputPath(normalizedOutput.path);
      toast(normalizedOutput.message);
    }

    const payload: MediaJobRequest["payload"] = {
      kind: "convert",
      inputPath: activeFile.path,
      outputPath: normalizedOutput.path,
      format,
      videoCodec: outputKind === "video" ? videoCodec.trim() || null : null,
      audioCodec: outputKind !== null ? audioCodec.trim() || null : null,
      extraArgs: buildConvertExtraArgs({
        format,
        outputKind,
        videoBitrateMbps: parseOptionalNumber(videoBitrate),
        audioBitrateKbps: parseOptionalInt(audioBitrate),
        maxWidth: parseOptionalInt(maxWidth),
      }),
      overwrite: true,
    };

    const request: MediaJobRequest = {
      jobId: crypto.randomUUID(),
      payload,
    };

    enqueueJob({
      id: request.jobId,
      fileName: activeFile.name,
      workflow: "Convert",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started conversion to .${"format" in payload ? payload.format : format}`);
  };

  const cancelConversion = async () => {
    if (!currentJob) {
      return;
    }

    await cancelJob(currentJob.id);
    toast("Conversion cancelled");
  };

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio" || file.kind === "image");
    if (!sourceFile) {
      toast.error("Drop a video, audio, or image file.");
      return;
    }

    await useWorkspaceStore.getState().selectActiveFile(sourceFile);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Convert</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile().catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        onRemoveSource={() => useWorkspaceStore.getState().clearActiveFile()}
        onDropSource={(files) => void handleDroppedSource(files)}
      />

      <Card>
        <CardContent className="space-y-4">
          {/* Format pill buttons */}
          <div className="flex flex-wrap gap-2">
            {availableFormats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleFormatChange(fmt)}
                style={{
                  padding: "0.28rem 0.85rem",
                  borderRadius: "var(--radius-lg)",
                  fontSize: "0.825rem",
                  fontWeight: 500,
                  border: "1px solid",
                  borderColor: format === fmt ? "var(--foreground)" : "var(--border)",
                  background: format === fmt ? "var(--foreground)" : "transparent",
                  color: format === fmt ? "var(--background)" : "var(--foreground)",
                  cursor: "pointer",
                  transition: "background 150ms, color 150ms, border-color 150ms",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Advanced Settings section */}
          {outputKind && (
            <>
              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1 h-px bg-border/40" />
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.15rem 0.65rem",
                    borderRadius: "9999px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                    fontSize: "0.675rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--muted)";
                    e.currentTarget.style.color = "var(--foreground)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--muted-foreground)";
                  }}
                >
                  <span>Advanced settings</span>
                  {showAdvanced ? (
                    <ChevronUp size={11} strokeWidth={2.5} className="opacity-80" />
                  ) : (
                    <ChevronDown size={11} strokeWidth={2.5} className="opacity-80" />
                  )}
                </button>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {showAdvanced && (
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {outputKind === "video" && (
                    <>
                      <Field label="Video codec">
                        <Input value={videoCodec} onChange={(e) => setVideoCodec(e.target.value)} placeholder="libx264" />
                      </Field>
                      <Field label="Video bitrate">
                        <Input value={videoBitrate} onChange={(e) => setVideoBitrate(e.target.value)} placeholder="5 Mbps" />
                      </Field>
                      <Field label="Max width">
                        <Input value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} placeholder="1080" />
                      </Field>
                      <Field label="Audio codec">
                        <Input value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)} placeholder="aac" />
                      </Field>
                      <Field label="Audio bitrate">
                        <Input value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} placeholder="128 kbps" />
                      </Field>
                    </>
                  )}
                  {outputKind === "audio" && (
                    <>
                      <Field label="Audio codec">
                        <Input value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)} placeholder="libmp3lame" />
                      </Field>
                      <Field label="Audio bitrate">
                        <Input value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} placeholder="128 kbps" />
                      </Field>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the converted file" />
              <Button variant="secondary" onClick={() => void handleChooseOutput()} disabled={!activeFile}>
                <Save className="mr-2 h-4 w-4" /> Choose
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {guidance && <OutputGuidanceCard guidance={guidance} />}

      {currentJob?.status === "running" ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{currentJob.phase ?? "Converting"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelConversion()}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentJob?.status === "completed" ? (
        <Card className="bg-success/5">
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-success">Conversion completed</p>
                <p className="truncate text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void revealInExplorer(currentJob.outputPath ?? outputPath)}
                className="shrink-0 border-success/20 hover:border-success/40 hover:bg-success/5"
              >
                <Folder className="mr-2 h-4 w-4" /> Open Folder
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => void startConversion()} size="lg" disabled={!activeFile || !outputPath}>
          <Play className="mr-2 h-4 w-4" /> Start Conversion
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={["grid gap-2", className].filter(Boolean).join(" ")}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function parseOptionalInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildConvertExtraArgs({
  format,
  outputKind,
  videoBitrateMbps,
  audioBitrateKbps,
  maxWidth,
}: {
  format: string;
  outputKind: "video" | "audio" | null;
  videoBitrateMbps?: number;
  audioBitrateKbps?: number;
  maxWidth?: number;
}) {
  const args: string[] = [];

  if (outputKind === "video") {
    if (videoBitrateMbps != null) {
      const bitrate = `${Math.round(videoBitrateMbps * 1000)}k`;
      args.push("-b:v", bitrate, "-maxrate", bitrate, "-bufsize", `${Math.round(videoBitrateMbps * 2000)}k`);
    }

    if (audioBitrateKbps != null) {
      args.push("-b:a", `${audioBitrateKbps}k`);
    }

    if (maxWidth != null) {
      args.push("-vf", `scale=w=min(${maxWidth}\\,iw):h=-2`);
    }

    if (format === "mp4") {
      args.push("-movflags", "+faststart", "-pix_fmt", "yuv420p");
    }
  } else if (outputKind === "audio" && audioBitrateKbps != null) {
    args.push("-b:a", `${audioBitrateKbps}k`);
  }

  return args.length > 0 ? args : undefined;
}
