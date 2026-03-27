import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Play } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Subtitles() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const subtitleFile = useWorkspaceStore((state) => state.subtitleFile);
  const setSubtitleFile = useWorkspaceStore((state) => state.setSubtitleFile);
  const clearSubtitleFile = useWorkspaceStore((state) => state.clearSubtitleFile);
  const { addJob, startJob } = useJobStore();
  const [mode, setMode] = useState("soft");

  const handleSubFile = (file: File) => {
    setSubtitleFile(file);
    toast.success(`Subtitle loaded: ${file.name}`);
  };

  const startSubtitleJob = () => {
    if (!activeFile || !subtitleFile) {
      toast.error("Select both a source video and a subtitle file first.");
      return;
    }

    const jobId = addJob({
      fileName: activeFile.name,
      workflow: "Subtitles",
    });

    startJob(jobId);
    toast.success(`Queued ${mode === "soft" ? "soft subtitle muxing" : "burn-in subtitles"}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Add Subtitles</h2>
        <p className="text-muted-foreground">Add soft subtitles (selectable) or burn them into the video frames.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Video</CardTitle>
          <CardDescription>
            {activeFile ? activeFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtitle File</CardTitle>
          <CardDescription>Requires .srt or .vtt formats.</CardDescription>
        </CardHeader>
        <CardContent>
          {subtitleFile ? (
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-4 border">
              <Type className="h-5 w-5 text-accent" />
              <span className="font-medium flex-1">{subtitleFile.name}</span>
              <Button variant="ghost" size="sm" onClick={clearSubtitleFile}>Remove</Button>
            </div>
          ) : (
            <FileDropZone 
              onFileSelect={handleSubFile} 
              accept=".srt,.vtt,.ass" 
              label="Drop a subtitle file here" 
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adding Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={mode} onValueChange={(val) => val && setMode(val)}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft Subtitles (can be toggled)</SelectItem>
              <SelectItem value="hard">Hardcode (burned into video)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!activeFile || !subtitleFile} onClick={startSubtitleJob}>
          <Play className="mr-2 h-4 w-4" /> Apply Subtitles
        </Button>
      </div>
    </div>
  );
}
