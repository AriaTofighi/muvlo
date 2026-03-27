import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FormatPicker } from "@/components/FormatPicker";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Convert() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, addJob, startJob, cancelJob } = useJobStore();
  const [format, setFormat] = useState("mp4");

  const currentJob = [...jobs]
    .reverse()
    .find((job) => job.workflow === "Convert" && job.fileName === activeFile?.name);

  const startConversion = () => {
    if (!activeFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }

    const jobId = addJob({
      fileName: activeFile.name,
      workflow: "Convert",
    });

    startJob(jobId);
    toast.success(`Queued ${activeFile.name} for conversion to .${format}`);
  };

  const cancelConversion = () => {
    if (!currentJob) {
      return;
    }

    cancelJob(currentJob.id);
    toast("Conversion cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Convert Media</h2>
        <p className="text-muted-foreground">Transcode your video or audio into a different format.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Media</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "No file selected. Go to Dashboard to select a file."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Format</span>
            <FormatPicker value={format} onChange={setFormat} />
          </div>
          {/* We will add Codec pickers here later depending on the selected format */}
        </CardContent>
      </Card>

      {currentJob?.status === "running" ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Converting to {format}...</span>
              <span className="font-mono">{currentJob.progress}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={cancelConversion}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentJob?.status === "completed" ? (
        <Card className="border-green-500/40">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-medium">Last conversion completed</p>
              <p className="text-sm text-muted-foreground">{activeFile?.name} is ready for export.</p>
            </div>
            <span className="font-mono text-sm text-green-500">100%</span>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={startConversion} size="lg" disabled={!activeFile}>
            <Play className="mr-2 h-4 w-4" /> Start Conversion
          </Button>
        </div>
      )}
    </div>
  );
}
