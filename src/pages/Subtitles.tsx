import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Folder, Type, Play, Save, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickInputFiles, pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { SUBTITLE_FILTERS, VIDEO_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";

export function Subtitles() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const subtitleFile = useWorkspaceStore((state) => state.subtitleFile);
  const setSubtitleFile = useWorkspaceStore((state) => state.setSubtitleFile);
  const clearSubtitleFile = useWorkspaceStore((state) => state.clearSubtitleFile);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [mode, setMode] = useState("soft");
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, activeFile.extension ?? "mp4", mode === "soft" ? "-subtitled" : "-burned"));
    } else {
      setOutputPath("");
    }
  }, [activeFile, subtitleFile?.path, mode]);

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

  const cancelSubtitleJob = async () => {
    if (!currentJob) {
      return;
    }

    await useJobStore.getState().cancelJob(currentJob.id);
    toast("Subtitle job cancelled");
  };

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video");
    if (!sourceFile) {
      toast.error("Drop a video file.");
      return;
    }

    await useWorkspaceStore.getState().selectActiveFile(sourceFile);
  };

  const handleDroppedSubtitle = async (files: SelectedFile[]) => {
    const nextSubtitle = files.find((file) => file.kind === "subtitle");
    if (!nextSubtitle) {
      toast.error("Drop an .srt, .vtt, or .ass subtitle file.");
      return;
    }

    setSubtitleFile(nextSubtitle);
    toast.success(`Subtitle loaded: ${nextSubtitle.name}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Add Subtitles</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile({ filters: VIDEO_FILTERS }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        onRemoveSource={() => useWorkspaceStore.getState().clearActiveFile()}
        onDropSource={(files) => void handleDroppedSource(files)}
        title="Source video"
      />

      <Card>
        <CardContent>
          {subtitleFile ? (
            <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-4">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-background/80 p-2">
                <Type className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{subtitleFile.name}</p>
                <p className="text-xs text-muted-foreground/70 font-mono mt-0.5 truncate lowercase">{subtitleFile.path}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearSubtitleFile} className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <FileDropZone
              onBrowse={() => {
                void handleSubFile().catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Failed to pick subtitle file.");
                });
              }}
              onFilesDrop={(files) => void handleDroppedSubtitle(files)}
              label="Choose a subtitle file"
              hint={undefined}
              className="py-5"
            />
          )}
        </CardContent>
      </Card>

      <Card>
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

          <Separator className="my-1" />

          <div className="grid gap-2 pt-3">
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

      {currentJob?.status === "running" ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>{currentJob.phase ?? "Adding subtitles"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelSubtitleJob()}>
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
                <p className="font-medium text-success">Subtitle job completed</p>
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
        <Button size="lg" disabled={!activeFile || !subtitleFile || !outputPath} onClick={() => void startSubtitleJob()}>
          <Play className="mr-2 h-4 w-4" /> Apply Subtitles
        </Button>
      </div>
    </div>
  );
}
