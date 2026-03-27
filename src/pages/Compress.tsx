import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Minimize, Square } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Compress() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { jobs, addJob, startJob, cancelJob } = useJobStore();
  const [quality, setQuality] = useState([70]); // 0-100 scale for simplicity

  const currentJob = [...jobs]
    .reverse()
    .find((job) => job.workflow === "Compress" && job.fileName === activeFile?.name);

  const startCompression = () => {
    if (!activeFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }

    const jobId = addJob({
      fileName: activeFile.name,
      workflow: "Compress",
    });

    startJob(jobId);
    toast.success(`Queued ${activeFile.name} for compression at ${quality[0]}% quality`);
  };

  const cancelCompression = () => {
    if (!currentJob) {
      return;
    }

    cancelJob(currentJob.id);
    toast("Compression cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compress Media</h2>
        <p className="text-muted-foreground">Reduce file size while preserving as much quality as possible.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source File</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compression Level</CardTitle>
          <CardDescription>Balance between visual quality and final file size.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Slider 
            value={quality} 
            max={100} 
            step={1} 
            onValueChange={(val) => setQuality(val as number[])} 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Smallest Size (0%)</span>
            <span className="font-mono font-medium text-foreground">{quality[0]}% Quality</span>
            <span>Best Quality (100%)</span>
          </div>
        </CardContent>
      </Card>

      {currentJob?.status === "running" ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Compressing...</span>
              <span className="font-mono">{currentJob.progress}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={cancelCompression}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : currentJob?.status === "completed" ? (
        <Card className="border-green-500/40">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-medium">Last compression completed</p>
              <p className="text-sm text-muted-foreground">Track finished jobs in the queue drawer.</p>
            </div>
            <span className="font-mono text-sm text-green-500">100%</span>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={startCompression} size="lg" disabled={!activeFile}>
            <Minimize className="mr-2 h-4 w-4" /> Start Compression
          </Button>
        </div>
      )}
    </div>
  );
}
