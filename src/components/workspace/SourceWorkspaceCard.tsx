import { AudioLines, Captions, Film, FileQuestion, ImageIcon, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { formatDuration, formatFileSize, getMediaDurationSeconds } from "@/lib/media-helpers";
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

const KIND_META = {
  video: {
    icon: Film,
    label: "Video source",
  },
  audio: {
    icon: AudioLines,
    label: "Audio source",
  },
  image: {
    icon: ImageIcon,
    label: "Image source",
  },
  subtitle: {
    icon: Captions,
    label: "Subtitle source",
  },
  unknown: {
    icon: FileQuestion,
    label: "Source media",
  },
} as const;

export function SourceWorkspaceCard({
  activeFile,
  onOpenSource,
  onRemoveSource,
  onDropSource,
  title = "Source media",
  description,
  emptyTitle = "Choose a file",
  replaceLabel = "Replace",
}: SourceWorkspaceCardProps) {
  const kindMeta = KIND_META[activeFile?.kind ?? "unknown"];
  const duration = formatDuration(getMediaDurationSeconds(activeFile?.mediaInfo));
  const videoStream = activeFile?.mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const Icon = kindMeta.icon;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        {activeFile ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between group transition-all duration-200">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-background/80 p-2.5 transition-colors">
                  {activeFile.infoStatus === "loading" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{activeFile.name}</p>
                    <span className="text-[10px] text-muted-foreground/60 font-medium px-1.5 py-0.5 rounded bg-muted/50 uppercase tracking-wider">
                      {activeFile.extension?.replace(".", "") ?? "FILE"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground/70 font-mono mt-0.5 lowercase">{activeFile.path}</p>
                  {activeFile.infoStatus === "error" && (
                    <p className="text-xs text-destructive mt-1 font-medium">{activeFile.infoError ?? "Media metadata could not be loaded."}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onOpenSource} className="h-8 shadow-none border-border/50 font-medium text-xs">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  {replaceLabel}
                </Button>
                {onRemoveSource && (
                  <Button type="button" variant="ghost" size="icon" onClick={onRemoveSource} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className={`grid ${activeFile.kind === "image" ? "grid-cols-2" : "grid-cols-3"} gap-6 px-1`}>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Size</p>
                <p className="text-sm font-medium text-foreground/90">{formatFileSize(activeFile.size)}</p>
              </div>
              {activeFile.kind !== "image" && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Duration</p>
                  <p className="text-sm font-medium text-foreground/90">{duration}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {activeFile.kind === "image" ? "Dimensions" : "Format"}
                </p>
                <p className="text-sm font-medium text-foreground/90">
                  {videoStream?.width && videoStream?.height ? `${videoStream.width}x${videoStream.height}` : activeFile.extension?.toUpperCase() ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <FileDropZone
            onBrowse={onOpenSource}
            onFilesDrop={onDropSource}
            label={emptyTitle}
            hint={undefined}
            className="px-6 py-8"
          />
        )}
      </CardContent>
    </Card>
  );
}
