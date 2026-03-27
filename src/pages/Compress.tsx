import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Folder, Minimize, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";

const qualityToCrf = (quality: number) => {
  const normalized = Math.max(0, Math.min(100, quality));
  return Math.round(35 - (normalized / 100) * 17);
};

const normalizeQualityValue = (value: number | readonly number[]) => {
  if (Array.isArray(value)) {
    return value[0] ?? 70;
  }

  return value;
};

export function Compress() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob, cancelJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [quality, setQuality] = useState(70);
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, activeFile.extension ?? "mp4", "-compressed"));
    } else {
      setOutputPath("");
    }
  }, [activeFile]);

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find(
          (job) =>
            job.workflow === "Compress" &&
            "inputPath" in job.request.payload &&
            job.request.payload.inputPath === activeFile?.path,
        ),
    [activeFile?.path, jobs],
  );

  const startCompression = async () => {
    if (!activeFile || !outputPath) {
      toast.error("Please select a file and output path first.");
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
        kind: "compress",
        inputPath: activeFile.path,
        outputPath: normalizedOutput.path,
        quality,
        overwrite: true,
      },
    };

    enqueueJob({
      id: request.jobId,
      fileName: activeFile.name,
      workflow: "Compress",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started compression at quality ${quality}%`);
  };

  const chooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, activeFile.extension ?? "mp4", "-compressed"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const cancelCompression = async () => {
    if (!currentJob) {
      return;
    }

    await cancelJob(currentJob.id);
    toast("Compression cancelled");
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
        <h2 className="text-3xl font-bold tracking-tight">Compress</h2>
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
        title="Source media"
      />

      <Card>
        <CardHeader>
          <CardTitle>Compression Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Slider
            value={[quality]}
            max={100}
            step={1}
            onValueChange={(value) => setQuality(normalizeQualityValue(value))}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Smaller File</span>
            <span className="font-mono font-medium text-foreground">
              {quality}% Quality / CRF {qualityToCrf(quality)}
            </span>
            <span>Higher Quality</span>
          </div>

          <Separator className="my-1" />
          <div className="grid gap-2 pt-3">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the compressed file" />
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
              <span>{currentJob.phase ?? "Compressing"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelCompression()}>
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
                <p className="font-medium text-success">Compression completed</p>
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
        <Button onClick={() => void startCompression()} size="lg" disabled={!activeFile || !outputPath}>
          <Minimize className="mr-2 h-4 w-4" /> Start Compression
        </Button>
      </div>
    </div>
  );
}
