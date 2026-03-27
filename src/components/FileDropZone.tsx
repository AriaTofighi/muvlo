import { useState, useCallback, useId } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileDropZoneProps {
  onFileSelect?: (file: File) => void;
  onBrowse?: () => void | Promise<void>;
  accept?: string;
  className?: string;
  label?: string;
  hint?: string;
  browseLabel?: string;
}

export function FileDropZone({
  onFileSelect,
  onBrowse,
  accept = "video/*,audio/*",
  className,
  label = "Drag & drop a media file here, or click to browse",
  hint = "Supports most video and audio formats",
  browseLabel = "Browse Files",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();

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
      if (onFileSelect && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onFileSelect && e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (onBrowse) {
      void onBrowse();
      return;
    }

    document.getElementById(inputId)?.click();
  }, [inputId, onBrowse]);

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
      onClick={handleClick}
    >
      <input
        id={inputId}
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
        <p className="text-sm">{hint}</p>
        <Button type="button" variant="secondary" className="pointer-events-none">
          {browseLabel}
        </Button>
      </div>
    </div>
  );
}
