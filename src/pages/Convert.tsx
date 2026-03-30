import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { toast } from "sonner";
import { OutputGuidanceContent } from "@/components/export/OutputGuidanceContent";
import { JobStatusCard } from "@/components/jobs/JobStatusCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import { pickOutputPath } from "@/lib/media-client";
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

  const supportsAdvancedSettings = useMemo(() => {
    if (activeFile?.kind === "image") {
      return false;
    }

    return AUDIO_FORMATS.includes(format) || VIDEO_FORMATS.includes(format);
  }, [AUDIO_FORMATS, VIDEO_FORMATS, activeFile?.kind, format]);

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

  const advancedFieldKind = useMemo(() => {
    if (outputKind != null) {
      return outputKind;
    }

    if (AUDIO_FORMATS.includes(format)) {
      return "audio";
    }

    if (VIDEO_FORMATS.includes(format)) {
      return "video";
    }

    return null;
  }, [AUDIO_FORMATS, VIDEO_FORMATS, format, outputKind]);

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
    toast.success(`Started conversion to .${format}`);
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
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500 will-change-[opacity] backface-hidden">
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

      <Card size="lg" className="relative overflow-visible">
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Format pill buttons and Advanced toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {availableFormats.map((fmt) => (
                  <Button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatChange(fmt)}
                    variant={format === fmt ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full px-4 text-[13px] font-bold leading-none",
                      format !== fmt && "text-muted-foreground",
                    )}
                  >
                    <span className="relative -top-px">{fmt}</span>
                  </Button>
                ))}
              </div>

              {supportsAdvancedSettings ? (
                <Button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  variant={showAdvanced ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "shrink-0 rounded-full px-3.5 text-[12px] font-semibold leading-none shadow-none",
                    !showAdvanced && "text-muted-foreground",
                  )}
                >
                  <span className="relative -top-px">{showAdvanced ? "Hide settings" : "Advanced"}</span>
                  {showAdvanced ? (
                    <ChevronUp size={10} strokeWidth={3} className="opacity-70" />
                  ) : (
                    <ChevronDown size={10} strokeWidth={3} className="opacity-70" />
                  )}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={outputPath}
                  onChange={(event) => setOutputPath(event.target.value)}
                  placeholder="Choose where to save the converted file"
                  className="flex-1 font-medium placeholder:font-normal h-10 shadow-none border-border/40"
                />
                <Button variant="outline" onClick={() => void handleChooseOutput()} disabled={!activeFile} className="shrink-0 font-medium h-10 gap-2.5 px-5 border-border/50 shadow-none sm:self-auto">
                  <Play className="h-4 w-4" /> Choose
                </Button>
              </div>
            </div>
          </div>

          {(guidance || (supportsAdvancedSettings && advancedFieldKind && showAdvanced)) && (
            <div className="space-y-4">
              {guidance && <OutputGuidanceContent guidance={guidance} className="py-0 px-0" />}

              {supportsAdvancedSettings && advancedFieldKind && showAdvanced && (
                <div className="grid gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300 md:grid-cols-2">
                  {advancedFieldKind === "video" && (
                    <>
                      <Field label="video codec">
                        <Input value={videoCodec} onChange={(e) => setVideoCodec(e.target.value)} placeholder="libx264" className="h-9 text-xs" />
                      </Field>
                      <Field label="video bitrate">
                        <Input value={videoBitrate} onChange={(e) => setVideoBitrate(e.target.value)} placeholder="5 Mbps" className="h-9 text-xs" />
                      </Field>
                      <Field label="max width">
                        <Input value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} placeholder="1080" className="h-9 text-xs" />
                      </Field>
                      <Field label="audio codec">
                        <Input value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)} placeholder="aac" className="h-9 text-xs" />
                      </Field>
                      <Field label="audio bitrate">
                        <Input value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} placeholder="128 kbps" className="h-9 text-xs" />
                      </Field>
                    </>
                  )}
                  {advancedFieldKind === "audio" && (
                    <>
                      <Field label="audio codec">
                        <Input value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)} placeholder="aac" className="h-9 text-xs" />
                      </Field>
                      <Field label="audio bitrate">
                        <Input value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} placeholder="128 kbps" className="h-9 text-xs" />
                      </Field>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {currentJob && (
        <JobStatusCard
          job={currentJob}
          outputPath={outputPath}
          onCancel={cancelJob}
          labels={{
            running: "Converting",
            completed: "Conversion completed",
          }}
        />
      )}

      <div className="flex justify-end">
        <Button onClick={() => void startConversion()} size="lg" disabled={!activeFile || !outputPath} className="h-10 gap-2.5 px-5 font-semibold">
          <Play className="h-4 w-4" /> Start Conversion
        </Button>
      </div>

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none px-0.5">{label}</span>
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
