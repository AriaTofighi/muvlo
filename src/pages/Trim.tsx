import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Scissors } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Trim() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { addJob, startJob } = useJobStore();
  const [range, setRange] = useState([0, 100]); // percentage from 0 to 100

  const startTrim = () => {
    if (!activeFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }

    const jobId = addJob({
      fileName: activeFile.name,
      workflow: "Trim",
    });

    startJob(jobId);
    toast.success(`Queued trim from ${range[0]}% to ${range[1]}%`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trim Video</h2>
        <p className="text-muted-foreground">Cut the start and end of your video without re-encoding.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Media</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Drag handles to set the start and end points.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="h-24 w-full bg-muted rounded-md border flex items-center justify-center relative overflow-hidden">
            {/* Placeholder for video thumbnails strip */}
            <span className="text-muted-foreground text-sm z-10 select-none">Video Timeline Placeholder</span>
            <div 
              className="absolute top-0 bottom-0 bg-accent/20 border-l border-r border-accent"
              style={{ left: `${range[0]}%`, right: `${100 - range[1]}%` }}
            />
          </div>
          
          <Slider 
            value={range} 
            max={100} 
            step={1} 
            minStepsBetweenValues={1}
            onValueChange={(val) => setRange(val as number[])} 
            className="w-full"
          />
          
          <div className="flex justify-between text-sm font-mono text-muted-foreground">
            <span>{range[0]}% (Start)</span>
            <span>{range[1]}% (End)</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile} onClick={startTrim}>
          <Scissors className="mr-2 h-4 w-4" /> Trim & Save
        </Button>
      </div>
    </div>
  );
}
