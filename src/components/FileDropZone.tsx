import { useState, useCallback, useEffect, useId, useRef } from "react";
import { Plus } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { cn } from "@/lib/utils";
import { hasTauriRuntime, resolveDroppedPaths } from "@/lib/media-client";
import type { SelectedFile } from "@/lib/media-types";

interface FileDropZoneProps {
  onFileSelect?: (file: File) => void;
  onBrowse?: () => void | Promise<void>;
  onFilesDrop?: (files: SelectedFile[]) => void | Promise<void>;
  accept?: string;
  className?: string;
  label?: string;
  hint?: string;
}

export function FileDropZone({
  onFileSelect,
  onBrowse,
  onFilesDrop,
  accept = "video/*,audio/*",
  className,
  label = "Drop a media file here or click to browse",
  hint,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onFilesDrop || !hasTauriRuntime()) {
      return;
    }

    let disposed = false;

    const unlistenPromise = getCurrentWebview().onDragDropEvent(async (event) => {
      if (disposed || !rootRef.current) {
        return;
      }

      if (event.payload.type === "leave") {
        setIsDragging(false);
        return;
      }

      const x = event.payload.position.x / window.devicePixelRatio;
      const y = event.payload.position.y / window.devicePixelRatio;
      const rect = rootRef.current.getBoundingClientRect();
      const isInside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

      if (event.payload.type === "over" || event.payload.type === "enter") {
        setIsDragging(isInside);
        return;
      }

      setIsDragging(false);

      if (event.payload.type !== "drop" || !isInside) {
        return;
      }

      const files = await resolveDroppedPaths(event.payload.paths);
      if (files.length > 0) {
        await onFilesDrop(files);
      }
    });

    return () => {
      disposed = true;
      setIsDragging(false);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onFilesDrop]);

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
      if (onFilesDrop) {
        return;
      }
      if (onFileSelect && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect, onFilesDrop]
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
      ref={rootRef}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-border/20 bg-muted/12 px-12 py-12 text-center transition-all duration-300",
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
      <div className="flex flex-col items-center">
        <div className="flex shrink-0 items-center justify-center h-12 w-12 rounded-xl bg-muted/20 backdrop-blur-sm transition-all duration-300 group-hover:bg-muted/35">
          <Plus className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <p className="mt-4 max-w-xl font-medium text-sm text-foreground leading-none">
          {label}
        </p>
        {hint ? (
          <p className="mt-2 max-w-sm text-[11px] text-muted-foreground/50 leading-relaxed font-medium">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
