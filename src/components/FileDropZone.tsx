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
        "group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-border/80 bg-muted/24 p-12 text-center transition-all hover:border-accent/35 hover:bg-muted/36",
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
            "h-12 w-12 transition-colors group-hover:text-accent",
            isDragging && "text-accent"
          )}
        />
        <p className="max-w-xl font-medium text-foreground">{label}</p>
        <p className="max-w-xl text-sm leading-6">{hint}</p>
        <Button type="button" variant="secondary" className="pointer-events-none rounded-xl">
          {browseLabel}
        </Button>
      </div>
    </div>
  );
}
