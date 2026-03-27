import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Progress } from "@/components/ui/progress";
import { Folder, Scissors, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { buildDefaultOutputPath, buildSuggestedOutputName, formatDuration, getMediaDurationSeconds, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";

export function Trim() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [range, setRange] = useState([0, 100]);
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    setRange([0, 100]);
    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, activeFile.extension ?? "mp4", "-trimmed"));
    } else {
      setOutputPath("");
    }
  }, [activeFile]);

  const durationSeconds = getMediaDurationSeconds(activeFile?.mediaInfo);
  const startSeconds = durationSeconds == null ? 0 : (range[0] / 100) * durationSeconds;
  const endSeconds = durationSeconds == null ? 0 : (range[1] / 100) * durationSeconds;

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find(
          (job) =>
            job.workflow === "Trim" &&
            "inputPath" in job.request.payload &&
            job.request.payload.inputPath === activeFile?.path,
        ),
    [activeFile?.path, jobs],
  );

  const chooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a source file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, activeFile.extension ?? "mp4", "-trimmed"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const startTrim = async () => {
    if (!activeFile || !outputPath || endSeconds <= startSeconds) {
      toast.error("Choose a valid trim range and output path first.");
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
        kind: "trim",
        inputPath: activeFile.path,
        outputPath: normalizedOutput.path,
        startSeconds,
        endSeconds,
        overwrite: true,
      },
    };

    enqueueJob({
      id: request.jobId,
      fileName: activeFile.name,
      workflow: "Trim",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started trim from ${formatDuration(startSeconds)} to ${formatDuration(endSeconds)}`);
  };

  const cancelTrim = async () => {
    if (!currentJob) {
      return;
    }

    await useJobStore.getState().cancelJob(currentJob.id);
    toast("Trim cancelled");
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
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trim</h2>
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
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="h-24 w-full rounded-md border bg-muted relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-accent/20 border-x border-accent"
              style={{ left: `${range[0]}%`, right: `${100 - range[1]}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {durationSeconds == null ? "Duration unavailable" : `Duration ${formatDuration(durationSeconds)}`}
            </div>
          </div>

          <Slider
            value={range}
            max={100}
            step={1}
            minStepsBetweenValues={1}
            onValueChange={(value) => setRange(value as number[])}
            className="w-full"
            disabled={!activeFile || durationSeconds == null}
          />

          <div className="flex justify-between text-sm font-mono text-muted-foreground">
            <span>{formatDuration(startSeconds)} (Start)</span>
            <span>{formatDuration(endSeconds)} (End)</span>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the trimmed clip" />
              <Button variant="secondary" onClick={() => void chooseOutput()} disabled={!activeFile}>
                <Save className="mr-2 h-4 w-4" /> Choose
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentJob?.status === "running" ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>{currentJob.phase ?? "Trimming"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelTrim()}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentJob?.status === "completed" ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-success">Trim completed</p>
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

      {currentJob?.status === "failed" && (
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 pt-6">
            <p className="font-medium">Trim failed</p>
            <p className="text-sm text-destructive">{currentJob.error ?? "Unknown FFmpeg error."}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !outputPath || durationSeconds == null} onClick={() => void startTrim()}>
          <Scissors className="mr-2 h-4 w-4" /> Trim & Save
        </Button>
      </div>
    </div>
  );
}
