import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FormatPicker } from "@/components/FormatPicker";
import { JobStatusCard } from "@/components/jobs/JobStatusCard";
import { SourceWorkspaceCard } from "@/components/workspace/SourceWorkspaceCard";
import { Minimize, Save } from "lucide-react";
import { toast } from "sonner";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { pickOutputPath } from "@/lib/media-client";
import { buildDefaultOutputPath, buildSuggestedOutputName, normalizeWorkflowOutputPath } from "@/lib/media-helpers";
import type { MediaJobRequest, SelectedFile } from "@/lib/media-types";

const COMPRESSIBLE_IMAGE_FORMATS = ["webp", "jpg"];

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
  const [format, setFormat] = useState("mp4");
  const [outputPath, setOutputPath] = useState("");

  const isImage = activeFile?.kind === "image";

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

  useEffect(() => {
    if (activeFile) {
      const targetFmt = isImage ? "webp" : (activeFile.extension || "mp4");
      setFormat(targetFmt);
      setOutputPath(buildDefaultOutputPath(activeFile, targetFmt, "-compressed"));
    } else {
      setOutputPath("");
    }
  }, [activeFile, isImage]);

  useEffect(() => {
    if (activeFile) {
      setOutputPath(buildDefaultOutputPath(activeFile, format, "-compressed"));
    }
  }, [format]);

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
    toast.success(`Started compression at ${quality}%`);
  };

  const chooseOutput = async () => {
    if (!activeFile) {
      toast.error("Select a file first.");
      return;
    }

    const nextPath = await pickOutputPath({
      suggestedName: buildSuggestedOutputName(activeFile, format, "-compressed"),
    });

    if (nextPath) {
      setOutputPath(nextPath);
    }
  };

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio" || file.kind === "image");
    if (!sourceFile) {
      toast.error("Drop a video, audio, or image file.");
      return;
    }

    await useWorkspaceStore.getState().selectActiveFile(sourceFile);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500 transform-gpu translate-z-0">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Compress</h2>
      </div>

      <SourceWorkspaceCard
        activeFile={activeFile}
        onOpenSource={() => {
          void openSourceFile().catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
          });
        }}
        onRemoveSource={() => useWorkspaceStore.getState().clearActiveFile()}
        onDropSource={(files) => void handleDroppedSource(files)}
      />

      <Card size="lg">
        <CardContent className="space-y-6">
          {isImage && (
            <div className="grid gap-2">
              <span className="text-sm font-medium">Output format</span>
              <FormatPicker
                value={format}
                onChange={setFormat}
                type="image"
                imageFormats={COMPRESSIBLE_IMAGE_FORMATS}
              />
              <p className="text-xs leading-relaxed text-muted-foreground/60">
                Only showing formats likely to reduce size. Use Convert for exact target formats.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase px-0.5">quality target</span>
            <Slider
              value={[quality]}
              max={100}
              step={1}
              onValueChange={(value) => setQuality(normalizeQualityValue(value))}
            />
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground/60 lowercase tracking-tight">
              <span>smallest</span>
              <span className="text-[12px] font-bold text-foreground bg-muted/40 px-2.5 py-0.5 rounded">
                {quality}% quality
              </span>
              <span>highest</span>
            </div>
          </div>

          <div className="grid gap-2 pt-2 border-t border-border/20">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="Choose where to save the compressed file" />
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
            running: "Compressing",
            completed: "Compression completed",
          }}
        />
      )}

      <div className="flex justify-end">
        <Button onClick={() => void startCompression()} size="lg" disabled={!activeFile || !outputPath} className="h-10 gap-2.5 px-5 font-semibold">
          <Minimize className="h-4 w-4" /> Start Compression
        </Button>
      </div>
    </div>
  );
}
