import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Scissors, Save } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath } from "@/lib/media-client";
import { buildSuggestedOutputName, formatDuration, getMediaDurationSeconds } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

export function Trim() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const [range, setRange] = useState([0, 100]);
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    setRange([0, 100]);
    setOutputPath("");
  }, [activeFile?.path]);

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

    const request: MediaJobRequest = {
      jobId: crypto.randomUUID(),
      payload: {
        kind: "trim",
        inputPath: activeFile.path,
        outputPath,
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trim Video</h2>
        <p className="text-muted-foreground">Cut the start and end of your clip into a new export.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Media</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Drag handles to set the start and end points.</CardDescription>
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

      {currentJob?.status === "completed" && (
        <Card className="border-green-500/40">
          <CardContent className="space-y-2 pt-6">
            <p className="font-medium">Trim completed</p>
            <p className="text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
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
