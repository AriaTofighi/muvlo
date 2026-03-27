import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormatPicker } from "@/components/FormatPicker";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Play, Save } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath } from "@/lib/media-client";
import { buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

export function ExtractAudio() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [format, setFormat] = useState("mp3");
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    setOutputPath("");
  }, [activeFile?.path, format]);

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
        bitrate: format === "flac" || format === "wav" ? null : "192k",
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Extract Audio</h2>
        <p className="text-muted-foreground">Pull the audio track from a video and save it as a separate file.</p>
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
            <FormatPicker value={format} onChange={setFormat} type="audio" />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the extracted audio" />
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
            <p className="font-medium">Audio extraction completed</p>
            <p className="text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !outputPath} onClick={() => void startExtraction()}>
          <Play className="mr-2 h-4 w-4" /> Extract to .{format}
        </Button>
      </div>
    </div>
  );
}
