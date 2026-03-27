import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Minimize, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath } from "@/lib/media-client";
import { buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

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
    setOutputPath("");
  }, [activeFile?.path]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compress Media</h2>
        <p className="text-muted-foreground">Reduce file size while preserving as much quality as possible.</p>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile().catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        title="Source file"
      />

      <Card>
        <CardHeader>
          <CardTitle>Compression Level</CardTitle>
          <CardDescription>Higher quality uses a lower CRF and a larger output file.</CardDescription>
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

          <div className="grid gap-2">
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
        <Card className="border-green-500/40">
          <CardContent className="space-y-2 pt-6">
            <p className="font-medium">Compression completed</p>
            <p className="text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
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
