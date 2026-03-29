import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Separator } from "@/components/ui/separator";
import { JobStatusCard } from "@/components/jobs/JobStatusCard";
import { Type, Play, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { SUBTITLE_FILTERS, VIDEO_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import { pickInputFiles, pickOutputPath } from "@/lib/media-client";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";

const SUBTITLE_MODE_ITEMS = [
  { value: "soft", label: "Soft Subtitles (toggleable track)" },
  { value: "hard", label: "Hardcode (burn into video)" },
] as const;

export function Subtitles() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const subtitleFile = useWorkspaceStore((state) => state.subtitleFile);
  const setSubtitleFile = useWorkspaceStore((state) => state.setSubtitleFile);
  const clearSubtitleFile = useWorkspaceStore((state) => state.clearSubtitleFile);
  const { jobs, enqueueJob, startJob, cancelJob } = useJobStore();
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
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500 transform-gpu translate-z-0">
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

      <Card size="lg">
        <CardContent>
          {subtitleFile ? (
            <div className="surface-inset flex items-center gap-3">
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
              size="compact"
            />
          )}
        </CardContent>
      </Card>

      <Card size="lg">
        <CardContent className="space-y-5">
          <Select value={mode} items={SUBTITLE_MODE_ITEMS} onValueChange={(value) => value && setMode(value)}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft Subtitles (toggleable track)</SelectItem>
              <SelectItem value="hard">Hardcode (burn into video)</SelectItem>
            </SelectContent>
          </Select>

          <Separator />

          <div className="grid gap-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the subtitled video" />
              <Button variant="outline" onClick={() => void chooseOutput()} disabled={!activeFile} className="shrink-0 font-medium h-10 gap-2.5 px-5 border-border/50 shadow-none">
                <Save className="h-4 w-4" /> Choose
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentJob && (
        <JobStatusCard
          job={currentJob}
          outputPath={outputPath}
          onCancel={cancelJob}
          labels={{
            running: mode === "soft" ? "Adding subtitles" : "Burning subtitles",
            completed: "Subtitle job completed",
          }}
        />
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !subtitleFile || !outputPath} onClick={() => void startSubtitleJob()} className="h-10 gap-2.5 px-5 font-semibold">
          <Play className="h-4 w-4" /> Apply Subtitles
        </Button>
      </div>
    </div>
  );
}
