import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickInputFiles, pickOutputPath } from "@/lib/media-client";
import { SUBTITLE_FILTERS, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

export function Subtitles() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const subtitleFile = useWorkspaceStore((state) => state.subtitleFile);
  const setSubtitleFile = useWorkspaceStore((state) => state.setSubtitleFile);
  const clearSubtitleFile = useWorkspaceStore((state) => state.clearSubtitleFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const [mode, setMode] = useState("soft");
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    setOutputPath("");
  }, [activeFile?.path, subtitleFile?.path, mode]);

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find(
          (job) =>
            job.workflow === "Subtitles" &&
            "inputPath" in job.request.payload &&
            job.request.payload.inputPath === activeFile?.path,
        ),
    [activeFile?.path, jobs],
  );

  const handleSubFile = async () => {
    const [file] = await pickInputFiles({
      multiple: false,
      filters: SUBTITLE_FILTERS,
    });

    if (!file) {
      return;
    }

    setSubtitleFile(file);
    toast.success(`Subtitle loaded: ${file.name}`);
  };

  const chooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a source video first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, activeFile.extension ?? "mp4", mode === "soft" ? "-subtitled" : "-burned"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const startSubtitleJob = async () => {
    if (!activeFile || !subtitleFile || !outputPath) {
      toast.error("Select a source, subtitle file, and output path first.");
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
        kind: "subtitles",
        inputPath: activeFile.path,
        subtitlePath: subtitleFile.path,
        outputPath: normalizedOutput.path,
        mode: mode === "hard" ? "hard" : "soft",
        overwrite: true,
      },
    };

    enqueueJob({
      id: request.jobId,
      fileName: activeFile.name,
      workflow: "Subtitles",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started ${mode === "soft" ? "soft subtitle" : "burn-in subtitle"} job`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add Subtitles</h2>
        <p className="text-muted-foreground">Mux subtitles as a selectable track or burn them into the video.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Video</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtitle File</CardTitle>
          <CardDescription>Requires .srt, .vtt, or .ass.</CardDescription>
        </CardHeader>
        <CardContent>
          {subtitleFile ? (
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-4 border">
              <Type className="h-5 w-5 text-accent" />
              <span className="font-medium flex-1">{subtitleFile.name}</span>
              <Button variant="ghost" size="sm" onClick={clearSubtitleFile}>Remove</Button>
            </div>
          ) : (
            <FileDropZone
              onBrowse={() => {
                void handleSubFile().catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Failed to pick subtitle file.");
                });
              }}
              label="Choose a subtitle file"
              hint="Use the native picker so FFmpeg can read the subtitle path."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adding Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={mode} onValueChange={(value) => value && setMode(value)}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft Subtitles (toggleable track)</SelectItem>
              <SelectItem value="hard">Hardcode (burn into video)</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the subtitled video" />
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
            <p className="font-medium">Subtitle job completed</p>
            <p className="text-sm text-muted-foreground">{currentJob.outputPath ?? outputPath}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !subtitleFile || !outputPath} onClick={() => void startSubtitleJob()}>
          <Play className="mr-2 h-4 w-4" /> Apply Subtitles
        </Button>
      </div>
    </div>
  );
}
