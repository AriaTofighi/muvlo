import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormatPicker } from "@/components/FormatPicker";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function ExtractAudio() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { addJob, startJob } = useJobStore();
  const [format, setFormat] = useState("mp3");

  const startExtraction = () => {
    if (!activeFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }

    const jobId = addJob({
      fileName: activeFile.name,
      workflow: "Extract Audio",
    });

    startJob(jobId);
    toast.success(`Queued audio extraction to .${format}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Extract Audio</h2>
        <p className="text-muted-foreground">Pull the audio track from a video and save it.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Media</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 w-full bg-muted/50 rounded-md border flex items-center justify-center relative overflow-hidden">
            {/* Waveform placeholder */}
            <div className="flex items-center gap-1 h-12 opacity-50">
              {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-accent rounded-full animate-pulse" 
                  style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Format</span>
            <FormatPicker value={format} onChange={setFormat} type="audio" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile} onClick={startExtraction}>
          <Play className="mr-2 h-4 w-4" /> Extract to .{format}
        </Button>
      </div>
    </div>
  );
}
