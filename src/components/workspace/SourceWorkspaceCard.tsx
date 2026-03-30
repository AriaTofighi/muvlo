import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { formatDuration, formatFileSize } from "@/lib/media-helpers";
import type { SelectedFile } from "@/lib/media-types";
import type { WorkspaceFile } from "@/stores/workspaceStore";

interface SourceWorkspaceCardProps {
  activeFile: WorkspaceFile | null;
  onOpenSource: () => void;
  onRemoveSource?: () => void;
  onDropSource?: (files: SelectedFile[]) => void | Promise<void>;
  title?: string;
  description?: string;
  emptyTitle?: string;
  replaceLabel?: string;
}

export function SourceWorkspaceCard({
  activeFile,
  onOpenSource,
  onRemoveSource,
  onDropSource,
  emptyTitle = "Choose a file",
  replaceLabel = "Replace",
}: SourceWorkspaceCardProps) {
  const videoStream = activeFile?.mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const duration = activeFile?.mediaInfo?.format.duration ? formatDuration(Number.parseFloat(activeFile.mediaInfo.format.duration)) : "00:00";

  return (
    <Card size="flush">
      <CardContent className={activeFile ? "p-[var(--surface-padding-comfortable)]" : undefined}>
        {activeFile ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{activeFile.name}</p>
                <p className="text-[10.5px] text-muted-foreground/60 leading-tight truncate lowercase tracking-tight">
                  {activeFile.path}
                </p>
                {activeFile.infoError && (
                  <p className="text-[10px] text-destructive mt-1 font-medium italic">{activeFile.infoError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={onOpenSource} className="h-8 shadow-none border-border/50 text-xs font-semibold px-3">
                  <RefreshCw className="mr-2 h-3 w-3" /> {replaceLabel}
                </Button>
                {onRemoveSource && (
                  <Button variant="ghost" size="icon" onClick={onRemoveSource} className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">size</span>
                <span className="text-sm font-bold text-foreground tracking-tight leading-none">{formatFileSize(activeFile.size)}</span>
              </div>
              {activeFile.kind !== "image" && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">duration</span>
                  <span className="text-sm font-bold text-foreground tracking-tight leading-none">{duration}</span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-[11.5px] font-semibold text-muted-foreground/90 lowercase leading-none">
                  {activeFile.kind === "image" ? "dimensions" : "resolution"}
                </span>
                <span className="text-sm font-bold text-foreground tracking-tight leading-none">
                  {videoStream?.width && videoStream?.height ? `${videoStream.width}x${videoStream.height}` : activeFile.extension?.toUpperCase() ?? "Unknown"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <FileDropZone
            onBrowse={onOpenSource}
            onFilesDrop={onDropSource}
            label={emptyTitle}
          />
        )}
      </CardContent>
    </Card>
  );
}
