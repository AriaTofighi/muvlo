import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Combine, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Merge() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleAddFile = (file: File) => {
    setFiles((prev) => [...prev, file]);
    toast.success(`Added ${file.name}`);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startMerge = () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 files to merge.");
      return;
    }
    setIsMerging(true);
    toast.success("Merging files...");
    setTimeout(() => {
      setIsMerging(false);
      toast.success("Files merged successfully!");
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Merge Media</h2>
        <p className="text-muted-foreground">Join multiple video or audio files into a single file sequentially.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Files to Merge</CardTitle>
          <CardDescription>Add files and drag to reorder them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border p-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-muted/50 p-2 text-sm shadow-sm border">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeFile(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <FileDropZone 
            onFileSelect={handleAddFile} 
            label="Drop an additional file here, or click to browse" 
            className="p-6"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={startMerge} size="lg" disabled={files.length < 2 || isMerging}>
          <Combine className="mr-2 h-4 w-4" /> 
          {isMerging ? "Merging..." : "Start Merge"}
        </Button>
      </div>
    </div>
  );
}
