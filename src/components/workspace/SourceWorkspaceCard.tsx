import { AudioLines, Captions, Film, FileQuestion, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatFileSize, getMediaDurationSeconds } from "@/lib/media-helpers";
import type { WorkspaceFile } from "@/stores/workspaceStore";

interface SourceWorkspaceCardProps {
  activeFile: WorkspaceFile | null;
  onOpenSource: () => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
  subtitle: {
    icon: Captions,
    label: "Subtitle source",
  },
  unknown: {
    icon: FileQuestion,
    label: "Source file",
  },
} as const;

export function SourceWorkspaceCard({
  activeFile,
  onOpenSource,
  title = "Source media",
  description,
  emptyTitle = "No source selected yet",
  emptyDescription = "Open a source file and keep working in this workflow.",
  replaceLabel = "Replace source",
}: SourceWorkspaceCardProps) {
  const kindMeta = KIND_META[activeFile?.kind ?? "unknown"];
  const duration = formatDuration(getMediaDurationSeconds(activeFile?.mediaInfo));
  const videoStream = activeFile?.mediaInfo?.streams.find((stream) => stream.codec_type === "video");
  const Icon = kindMeta.icon;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {activeFile ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-accent/10 text-accent">
                  {activeFile.infoStatus === "loading" ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{activeFile.name}</p>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {kindMeta.label}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{activeFile.path}</p>
                  {activeFile.infoStatus === "error" && (
                    <p className="text-sm text-destructive">{activeFile.infoError ?? "Media metadata could not be loaded."}</p>
                  )}
                </div>
              </div>
              <Button type="button" variant="secondary" className="sm:self-start" onClick={onOpenSource}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {replaceLabel}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Size</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{formatFileSize(activeFile.size)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Duration</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{duration}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Format</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {videoStream?.width && videoStream?.height ? `${videoStream.width}x${videoStream.height}` : activeFile.extension?.toUpperCase() ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{emptyDescription}</p>
            <Button type="button" className="mt-5" onClick={onOpenSource}>
              Open source file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
