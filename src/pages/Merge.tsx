import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Combine, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useJobStore } from "@/stores/jobStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Merge() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const files = useWorkspaceStore((state) => state.mergeFiles);
  const addMergeFile = useWorkspaceStore((state) => state.addMergeFile);
  const useActiveFileForMerge = useWorkspaceStore((state) => state.useActiveFileForMerge);
  const removeMergeFile = useWorkspaceStore((state) => state.removeMergeFile);
  const clearMergeFiles = useWorkspaceStore((state) => state.clearMergeFiles);
  const { addJob, startJob } = useJobStore();

  const handleAddFile = (file: File) => {
    addMergeFile(file);
    toast.success(`Added ${file.name}`);
  };

  const startMerge = () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 files to merge.");
      return;
    }

    const jobId = addJob({
      fileName: `${files.length} files`,
      workflow: "Merge",
    });

    startJob(jobId);
    toast.success(`Queued merge for ${files.length} files`);
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
          <CardDescription>Add files and drag to reorder them. The active source can also be added directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeFile && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">Current source</p>
                <p className="truncate text-muted-foreground">{activeFile.name}</p>
              </div>
              <Button variant="secondary" onClick={useActiveFileForMerge}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          )}
          {files.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border p-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 rounded-md bg-muted/50 p-2 text-sm shadow-sm border">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeMergeFile(file.id)}>
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
          {files.length > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearMergeFiles}>
                Clear List
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={startMerge} size="lg" disabled={files.length < 2}>
          <Combine className="mr-2 h-4 w-4" /> 
          Start Merge
        </Button>
      </div>
    </div>
  );
}
