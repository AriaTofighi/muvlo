import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Input } from "@/components/ui/input";
import { Combine, Folder, GripVertical, Plus, Save, Square, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickInputFiles, pickOutputPath, revealInExplorer } from "@/lib/media-client";
import { MEDIA_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
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
      filters: MEDIA_FILTERS,
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
        <h2 className="text-3xl font-bold tracking-tight">Merge Media</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Files to Merge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeFile && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">Current source</p>
                <p className="truncate text-muted-foreground">{activeFile.name}</p>
              </div>
              <Button variant="secondary" onClick={useActiveFileForMerge}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border p-2">
              {files.map((file) => (
                <div key={file.path} className="flex items-center gap-3 rounded-md bg-muted/50 p-2 text-sm shadow-sm border">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeMergeFile(file.path)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <FileDropZone
            onBrowse={() => {
              void handleAddFiles().catch((error) => {
                toast.error(error instanceof Error ? error.message : "Failed to open file picker.");
              });
            }}
            label="Add files to the merge list"
            hint="Use the native picker to choose multiple clips or tracks."
            className="p-6"
          />

          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Path</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the merged file" />
              <Button variant="secondary" onClick={() => void chooseOutput()} disabled={files.length === 0}>
                <Save className="mr-2 h-4 w-4" /> Choose
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearMergeFiles}>
                Clear List
              </Button>
            </div>
          )}
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
        <Card className="border-green-500/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-green-600 dark:text-green-400">Merge completed</p>
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
        <Button onClick={() => void startMerge()} size="lg" disabled={files.length < 2 || !outputPath}>
          <Combine className="mr-2 h-4 w-4" />
          Start Merge
        </Button>
      </div>
    </div>
  );
}
