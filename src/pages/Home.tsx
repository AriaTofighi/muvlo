import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileVideo, Scissors, Minimize, Combine, Music, Type, Trash2, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Button } from "@/components/ui/button";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getMediaToolStatus, hasTauriRuntime } from "@/lib/media-client";
import { formatFileSize } from "@/lib/media-helpers";
import type { MediaToolStatus, SelectedFile } from "@/lib/media-types";
import { toast } from "sonner";

export function Home() {
  const navigate = useNavigate();
  const { recentFiles, selectActiveFile, activeFile, clearActiveFile } = useWorkspaceStore();
  const [toolStatus, setToolStatus] = useState<MediaToolStatus | null>(null);
  const tauriReady = hasTauriRuntime();
  const { openSourceFile } = useSourceFileActions();

  useEffect(() => {
    if (!tauriReady) {
      return;
    }

    getMediaToolStatus()
      .then(setToolStatus)
      .catch(() => {
        setToolStatus(null);
      });
  }, [tauriReady]);

  const handleBrowse = async () => {
    await openSourceFile({ navigateTo: "/convert" });
  };

  const handleDroppedSource = async (files: SelectedFile[]) => {
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio" || file.kind === "image");
    if (!sourceFile) {
      toast.error("Drop a video, audio, or image file.");
      return;
    }

    await selectActiveFile(sourceFile);
    navigate("/convert");
  };

  const workflows = [
    { title: "Convert", path: "/convert", icon: FileVideo },
    { title: "Compress", path: "/compress", icon: Minimize },
    { title: "Trim", path: "/trim", icon: Scissors },
    { title: "Merge", path: "/merge", icon: Combine },
    { title: "Extract Audio", path: "/extract-audio", icon: Music },
    { title: "Subtitles", path: "/subtitles", icon: Type },
  ];

  return (
    <div
      className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col justify-center gap-6 animate-in fade-in duration-500 will-change-[opacity] backface-hidden md:-translate-y-3 lg:-translate-y-5"
    >
      {!tauriReady && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="space-y-1">
            <p className="font-semibold text-destructive">Tauri runtime not detected</p>
            <p className="text-sm text-destructive/80">
              This screen is running in a browser session. Native file dialogs and FFmpeg are unavailable.
              Launch with <code>npm run tauri dev</code>.
            </p>
          </CardContent>
        </Card>
      )}

      <Card size="flush">
        <CardContent className={activeFile ? "p-[var(--surface-padding-comfortable)]" : undefined}>
          {activeFile ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-extrabold text-foreground text-sm">{activeFile.name}</p>
                    <span className="text-[10px] text-muted-foreground/60 font-bold px-1.5 py-0.5 rounded bg-muted/60 uppercase tracking-wider">
                      {activeFile.extension?.replace(".", "") ?? "FILE"}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground/60 mt-0.5 lowercase tracking-tight">{activeFile.path}</p>
                  {activeFile.infoStatus === "error" && (
                    <p className="text-xs text-destructive mt-1 font-medium italic">{activeFile.infoError ?? "Metadata unavailable"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void handleBrowse()} className="h-8 border-border/50 font-medium text-xs">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Replace
                </Button>
                <Button variant="ghost" size="icon" onClick={clearActiveFile} className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <FileDropZone
              onBrowse={() => {
                void handleBrowse().catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Failed to open file picker.");
                });
              }}
              onFilesDrop={(files) => void handleDroppedSource(files)}
              label="Choose a file to start"
              hint={tauriReady ? undefined : "Tauri runtime not detected. Launch with `npm run tauri dev` instead of `npm run dev`."}
            />
          )}
        </CardContent>
      </Card>

      {recentFiles.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Imports
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentFiles.slice(0, 4).map((file) => (
                <button
                  key={file.path}
                  className="surface-inset-compact flex items-center justify-between gap-4 text-left transition hover:border-accent/40 hover:bg-accent/5 group"
                  onClick={() => void selectActiveFile(file).then(() => navigate("/convert"))}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-muted-foreground group-hover:text-accent transition-colors">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 lowercase tracking-tight">{file.path}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-muted-foreground border border-border/80 rounded px-2 py-0.5 bg-muted/20">
                    {formatFileSize(file.size)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Link key={workflow.path} to={workflow.path} className="group">
            <Card size="sm" className="h-full hover:bg-accent/[0.03] transition-colors">
              <CardHeader className="flex-row items-center gap-3 p-[var(--card-padding-block)]">
                <workflow.icon className="size-4 text-muted-foreground group-hover:text-accent transition-colors" />
                <CardTitle className="text-sm font-bold text-foreground group-hover:text-accent transition-colors m-0 leading-none">
                  {workflow.title}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {toolStatus && (!toolStatus.ffmpegAvailable || !toolStatus.ffprobeAvailable) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="space-y-1">
            <p className="font-semibold text-destructive">FFmpeg tools not ready</p>
            <p className="text-sm text-destructive/80">
              Muvlo needs <code>ffmpeg</code> and <code>ffprobe</code> on your system path.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
