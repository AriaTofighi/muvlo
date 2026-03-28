import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Input } from "@/components/ui/input";
import { Combine, Folder, GripVertical, Plus, Save, Square, Trash2, FileVideo } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickInputFiles, pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { VIDEO_AND_AUDIO_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest } from "@/lib/media-types";

export function Merge() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const files = useWorkspaceStore((state) => state.mergeFiles);
  const addMergeFiles = useWorkspaceStore((state) => state.addMergeFiles);
  const useActiveFileForMerge = useWorkspaceStore((state) => state.useActiveFileForMerge);
  const removeMergeFile = useWorkspaceStore((state) => state.removeMergeFile);
  const clearMergeFiles = useWorkspaceStore((state) => state.clearMergeFiles);
  const { jobs, enqueueJob, startJob } = useJobStore();
  const [outputPath, setOutputPath] = useState("");

  useEffect(() => {
    if (files.length > 0) {
      setOutputPath(buildDefaultOutputPath(files[0], files[0].extension ?? "mp4", "-merged"));
    } else {
      setOutputPath("");
    }
  }, [files.length]);

  const currentJob = useMemo(
    () =>
      [...jobs]
        .reverse()
        .find((job) => job.workflow === "Merge"),
    [jobs],
  );

  const handleAddFiles = async () => {
    const nextFiles = await pickInputFiles({
      multiple: true,
      filters: VIDEO_AND_AUDIO_FILTERS,
    });

    if (nextFiles.length === 0) {
      return;
    }

    addMergeFiles(nextFiles);
    toast.success(`Added ${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} to the merge list`);
  };

  const chooseOutput = async () => {
    if (files.length === 0) {
      toast.error("Add files to merge first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(files[0], files[0].extension ?? "mp4", "-merged"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const startMerge = async () => {
    if (files.length < 2 || !outputPath) {
      toast.error("Add at least two files and choose an output path.");
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
        kind: "merge",
        inputPaths: files.map((file) => file.path),
        outputPath: normalizedOutput.path,
        overwrite: true,
      },
    };

    enqueueJob({
      id: request.jobId,
      fileName: `${files.length} files`,
      workflow: "Merge",
      request,
    });

    await startJob(request.jobId);
    toast.success(`Started merge for ${files.length} files`);
  };

  const cancelMerge = async () => {
    if (!currentJob) {
      return;
    }

    await useJobStore.getState().cancelJob(currentJob.id);
    toast("Merge cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Merge</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Files to merge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeFile && (
            <div className="flex items-center justify-between rounded-xl bg-muted/10 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-background/80 p-2">
                  <FileVideo className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{activeFile.name}</p>
                  <p className="text-xs text-muted-foreground/70">Current workspace source</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={useActiveFileForMerge} className="h-8 shadow-none border-border/50">
                <Plus className="mr-2 h-3.5 w-3.5" /> Add to list
              </Button>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-muted/5 p-1">
              {files.map((file) => (
                <div key={file.path} className="flex items-center gap-3 rounded-lg bg-background/80 p-2 group transition-all">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono truncate lowercase">{file.path}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMergeFile(file.path)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-1 pr-1">
                <Button variant="ghost" size="sm" onClick={clearMergeFiles} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  Clear List
                </Button>
              </div>
            </div>
          )}

          <FileDropZone
            onBrowse={() => {
              void handleAddFiles().catch((error) => {
                toast.error(error instanceof Error ? error.message : "Failed to open file picker.");
              });
            }}
            onFilesDrop={async (files) => {
              const mediaFiles = files.filter((file) => file.kind === "video" || file.kind === "audio");
              if (mediaFiles.length === 0) {
                toast.error("Drop video or audio files to merge.");
                return;
              }

              addMergeFiles(mediaFiles);
              toast.success(`Added ${mediaFiles.length} file${mediaFiles.length === 1 ? "" : "s"} to the merge list`);
            }}
            label="Add files to the merge list"
            hint={undefined}
            className="p-6"
          />

          <Separator className="my-1" />

          <div className="grid gap-2 pt-3">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the merged file" />
              <Button variant="secondary" onClick={() => void chooseOutput()} disabled={files.length === 0}>
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
              <span>{currentJob.phase ?? "Merging"}...</span>
              <span className="font-mono">{Math.round(currentJob.progress)}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => void cancelMerge()}>
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
                <p className="font-medium text-success">Merge completed</p>
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
        <Button onClick={() => void startMerge()} size="lg" disabled={files.length < 2 || !outputPath}>
          <Combine className="mr-2 h-4 w-4" />
          Start Merge
        </Button>
      </div>
    </div>
  );
}
