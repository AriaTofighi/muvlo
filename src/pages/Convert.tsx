import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FormatPicker } from "@/components/FormatPicker";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Folder, Play, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

export function Convert() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob, cancelJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [format, setFormat] = useState("mp4");
  const [outputPath, setOutputPath] = useState("");

  const suggestedOutputName = activeFile
    ? buildSuggestedOutputName(activeFile, format, "-converted")
    : null;

  useEffect(() => {
    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, format, "-converted"));
    } else {
      setOutputPath("");
    }
  }, [activeFile, format]);

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

  const handleChooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a source file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: suggestedOutputName,
    });

    if (nextPath) {
      setOutputPath(nextPath);
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

    const request: MediaJobRequest = {
      jobId: crypto.randomUUID(),
      payload: {
        kind: "convert",
        inputPath: activeFile.path,
        outputPath: normalizedOutput.path,
        format,
        overwrite: true,
      },
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

  const cancelConversion = async () => {
    if (!currentJob) {
      return;
    }

    await cancelJob(currentJob.id);
    toast("Conversion cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Convert Media</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile().catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Target Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Format</span>
            <FormatPicker value={format} onChange={setFormat} />
          </div>

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

      {currentJob?.status === "running" ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
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
        <Card className="border-green-500/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-green-600 dark:text-green-400">Conversion completed</p>
                <p className="truncate text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void revealInExplorer(currentJob.outputPath ?? outputPath)}
                className="shrink-0 border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5"
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
