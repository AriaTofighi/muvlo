import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Folder, Play, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { OutputGuidanceCard } from "@/components/export/OutputGuidanceCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FormatPicker } from "@/components/FormatPicker";
import { VIDEO_AND_AUDIO_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import { pickOutputPath, revealInExplorer } from "@/lib/media-client";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";
import { buildOutputGuidance } from "@/lib/output-guidance";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function ExtractAudio() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [format, setFormat] = useState("mp3");
  const [outputPath, setOutputPath] = useState("");
  const [audioCodec, setAudioCodec] = useState("");
  const [audioBitrate, setAudioBitrate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!activeFile) {
      setFormat("mp3");
      setOutputPath("");
      setAudioCodec("");
      setAudioBitrate("");
      return;
    }

    setFormat("mp3");
    setOutputPath(buildDefaultOutputPath(activeFile, "mp3", "-audio"));
    setAudioCodec("");
    setAudioBitrate("");
  }, [activeFile]);

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find(
          (job) =>
            job.workflow === "Extract Audio" &&
            "inputPath" in job.request.payload &&
            job.request.payload.inputPath === activeFile?.path,
        ),
    [activeFile?.path, jobs],
  );

  const guidance = useMemo(() => {
    if (!activeFile) {
      return null;
    }

    return buildOutputGuidance({
      file: activeFile,
      format,
      outputKind: "audio",
      audioCodec,
      audioBitrateKbps: parseOptionalInt(audioBitrate),
    });
  }, [activeFile, audioBitrate, audioCodec, format]);

  const chooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a source file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, format, "-audio"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const handleFormatChange = (nextFormat: string) => {
    setFormat(nextFormat);

    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, nextFormat, "-audio"));
    }
  };

  const startExtraction = async () => {
    if (!activeFile || !outputPath) {
      toast.error("Select a source file and output path first.");
      return;
    }

    const normalizedOutput = normalizeWorkflowOutputPath(outputPath);
    if (normalizedOutput.changed) {
      setOutputPath(normalizedOutput.path);
      toast(normalizedOutput.message);
    }

    const request: MediaJobRequest = {
      jobId: crypto.randomUUID(),
      payload: {
        kind: "extract_audio",
        inputPath: activeFile.path,
        outputPath: normalizedOutput.path,
        format,
        audioCodec: audioCodec.trim() || null,
        bitrate: parseOptionalInt(audioBitrate) != null ? `${parseOptionalInt(audioBitrate)}k` : null,
        overwrite: true,
      },
    };

    enqueueJob({
      id: request.jobId,
      fileName: activeFile.name,
      workflow: "Extract Audio",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started audio extraction to .${format}`);
  };

  const cancelExtraction = async () => {
    if (!currentJob) {
      return;
    }

    await useJobStore.getState().cancelJob(currentJob.id);
    toast("Extraction cancelled");
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
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Extract Audio</h2>
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
        <CardContent className="space-y-5">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Output format</span>
              <FormatPicker value={format} onChange={handleFormatChange} type="audio" />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="flex-1 h-px bg-border/40" />
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
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
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Audio codec</span>
                  <Input value={audioCodec} onChange={(event) => setAudioCodec(event.target.value)} placeholder="Auto / libmp3lame / aac" />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Audio bitrate kbps</span>
                  <Input value={audioBitrate} onChange={(event) => setAudioBitrate(event.target.value)} placeholder="Auto" />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-2 pt-2 border-t border-border/20">
            <span className="text-sm font-medium">Output path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the extracted audio" />
              <Button variant="secondary" onClick={() => void chooseOutput()} disabled={!activeFile}>
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
              <span>{currentJob.phase ?? "Extracting"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelExtraction()}>
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
                <p className="font-medium text-success">Audio extraction completed</p>
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
        <Button size="lg" disabled={!activeFile || !outputPath} onClick={() => void startExtraction()}>
          <Play className="mr-2 h-4 w-4" /> Extract to .{format}
        </Button>
      </div>
    </div>
  );
}

function parseOptionalInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
