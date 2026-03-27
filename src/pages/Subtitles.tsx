import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Play } from "lucide-react";
import { toast } from "sonner";

export function Subtitles() {
  const location = useLocation();
  const initialFile = location.state?.file as File | undefined;
  
  const [subFile, setSubFile] = useState<File | null>(null);
  const [mode, setMode] = useState("soft");

  const handleSubFile = (file: File) => {
    setSubFile(file);
    toast.success(`Subtitle loaded: ${file.name}`);
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
            {initialFile ? initialFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtitle File</CardTitle>
          <CardDescription>Requires .srt or .vtt formats.</CardDescription>
        </CardHeader>
        <CardContent>
          {subFile ? (
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-4 border">
              <Type className="h-5 w-5 text-accent" />
              <span className="font-medium flex-1">{subFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setSubFile(null)}>Remove</Button>
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
        <Button size="lg" disabled={!initialFile || !subFile}>
          <Play className="mr-2 h-4 w-4" /> Apply Subtitles
        </Button>
      </div>
    </div>
  );
}
