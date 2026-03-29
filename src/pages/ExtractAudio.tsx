import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { OutputGuidanceContent } from "@/components/export/OutputGuidanceContent";
import { JobStatusCard } from "@/components/jobs/JobStatusCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormatPicker } from "@/components/FormatPicker";
import { VIDEO_AND_AUDIO_FILTERS, buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import { pickOutputPath } from "@/lib/media-client";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";
import { buildOutputGuidance } from "@/lib/output-guidance";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function ExtractAudio() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, enqueueJob, startJob, cancelJob } = useJobStore();
  const { openSourceFile } = useSourceFileActions();
  const [format, setFormat] = useState("mp3");
  const [outputPath, setOutputPath] = useState("");
  const [audioCodec, setAudioCodec] = useState("");
  const [audioBitrate, setAudioBitrate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!activeFile) {
      setFormat("mp3");
      setOutputPath("");
      setAudioCodec("");
      setAudioBitrate("");
      return;
    }

    setFormat("mp3");
    setOutputPath(buildDefaultOutputPath(activeFile, "mp3", "-audio"));
    setAudioCodec("");
    setAudioBitrate("");
  }, [activeFile]);

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

  const guidance = useMemo(() => {
    if (!activeFile) {
      return null;
    }

    return buildOutputGuidance({
      file: activeFile,
      format,
      outputKind: "audio",
      audioCodec,
      audioBitrateKbps: parseOptionalInt(audioBitrate),
    });
  }, [activeFile, audioBitrate, audioCodec, format]);

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

  const handleFormatChange = (nextFormat: string) => {
    setFormat(nextFormat);

    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, nextFormat, "-audio"));
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
        audioCodec: audioCodec.trim() || null,
        bitrate: parseOptionalInt(audioBitrate) != null ? `${parseOptionalInt(audioBitrate)}k` : null,
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

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio");
    if (!sourceFile) {
      toast.error("Drop a video or audio file.");
      return;
    }

    await useWorkspaceStore.getState().selectActiveFile(sourceFile);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500 transform-gpu translate-z-0">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Extract Audio</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile({ filters: VIDEO_AND_AUDIO_FILTERS }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        onRemoveSource={() => useWorkspaceStore.getState().clearActiveFile()}
        onDropSource={(files) => void handleDroppedSource(files)}
      />

      <Card size="lg" className="relative overflow-visible">
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <span className="px-0.5 text-[11.5px] font-semibold lowercase leading-none text-muted-foreground">target format</span>
              <FormatPicker value={format} onChange={handleFormatChange} type="audio" />
            </div>

            <div className="grid gap-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={outputPath}
                  onChange={(event) => setOutputPath(event.target.value)}
                  placeholder="Choose where to save the extracted audio"
                  className="flex-1 font-medium placeholder:font-normal h-10"
                />
                <Button variant="outline" onClick={() => void chooseOutput()} disabled={!activeFile} className="shrink-0 font-medium h-10 gap-2.5 px-5 border-border/50 shadow-none">
                  <Save className="h-4 w-4" /> Choose
                </Button>
              </div>
            </div>
          </div>

          <div className="surface-inset space-y-3 pb-0">
            {guidance && <OutputGuidanceContent guidance={guidance} />}

            {showAdvanced && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1 pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <span className="px-0.5 text-[11.5px] font-semibold lowercase leading-none text-muted-foreground">audio codec</span>
                    <Input value={audioCodec} onChange={(event) => setAudioCodec(event.target.value)} placeholder="Auto / libmp3lame / aac" />
                  </div>
                  <div className="grid gap-1.5">
                    <span className="px-0.5 text-[11.5px] font-semibold lowercase leading-none text-muted-foreground">bitrate kbps</span>
                    <Input value={audioBitrate} onChange={(event) => setAudioBitrate(event.target.value)} placeholder="Auto" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center translate-y-1/2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced((value) => !value)}
                className="z-10 rounded-full bg-card px-3 text-[11px] font-semibold text-muted-foreground shadow-none"
              >
                <span>Advanced settings</span>
                {showAdvanced ? (
                  <ChevronUp size={10} strokeWidth={3} />
                ) : (
                  <ChevronDown size={10} strokeWidth={3} />
                )}
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
            running: "Extracting",
            completed: "Audio extraction completed",
          }}
        />
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !outputPath} onClick={() => void startExtraction()} className="h-10 gap-2.5 px-5 font-semibold">
          <Play className="h-4 w-4" /> Extract to .{format}
        </Button>
      </div>
    </div>
  );
}

function parseOptionalInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
