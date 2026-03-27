import { useState, useCallback } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  label?: string;
}

export function FileDropZone({
  onFileSelect,
  accept = "video/*,audio/*",
  className,
  label = "Drag & drop a media file here, or click to browse",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center transition-colors hover:bg-muted/50",
        isDragging && "border-accent bg-accent/10",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("fileDropzoneInput")?.click()}
    >
      <input
        id="fileDropzoneInput"
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <UploadCloud
          className={cn(
            "h-12 w-12 transition-colors",
            isDragging && "text-accent"
          )}
        />
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm">Supports most video and audio formats</p>
      </div>
    </div>
  );
}
