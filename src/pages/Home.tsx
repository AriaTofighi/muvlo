import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileVideo, Scissors, Minimize, Combine, Music, Type, Trash2, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    const sourceFile = files.find((file) => file.kind === "video" || file.kind === "audio");
    if (!sourceFile) {
      toast.error("Drop a video or audio file.");
      return;
    }

    await selectActiveFile(sourceFile);
    navigate("/convert");
  };

  const workflows = [
    { title: "Convert", desc: "Change formats", path: "/convert", icon: FileVideo },
    { title: "Trim", desc: "Cut video length", path: "/trim", icon: Scissors },
    { title: "Compress", desc: "Reduce file size", path: "/compress", icon: Minimize },
    { title: "Merge", desc: "Join multiple files", path: "/merge", icon: Combine },
    { title: "Extract Audio", desc: "Save track to MP3", path: "/extract-audio", icon: Music },
    { title: "Subtitles", desc: "Add or burn subs", path: "/subtitles", icon: Type },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Welcome to Muvlo</h2>
      </div>

      {!tauriReady && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle>Tauri Runtime Not Detected</CardTitle>
            <CardDescription>
              This screen is running in a plain browser session, so native file dialogs and FFmpeg commands are unavailable.
              Start Muvlo with <code>npm run tauri dev</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Source File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeFile ? (
            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex shrink-0 items-center justify-center p-2.5 rounded-lg border bg-background">
                  <FileVideo className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{activeFile.name}</p>
                  <p className="text-xs text-muted-foreground/70 font-mono mt-0.5 truncate lowercase">{activeFile.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void handleBrowse()} className="h-8 border-border/50 font-medium text-xs">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Replace
                </Button>
                <Button variant="ghost" size="icon" onClick={clearActiveFile} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
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
              className="py-12"
            />
          )}
        </CardContent>
      </Card>

      {recentFiles.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Imports
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {recentFiles.slice(0, 4).map((file) => (
              <button
                key={file.path}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 p-3 text-left transition hover:border-accent/40 hover:bg-accent/5 group"
                onClick={() => void selectActiveFile(file).then(() => navigate("/convert"))}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:text-accent transition-colors">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 truncate font-mono lowercase">{file.path}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground/50 border rounded px-1.5 py-0.5 bg-muted/30">
                  {formatFileSize(file.size)}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Link key={workflow.path} to={workflow.path}>
            <Card className="h-full border-border/60 transition hover:border-accent/40 hover:bg-accent/5 group">
              <CardHeader>
                <workflow.icon className="mb-2 h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
                <CardTitle className="group-hover:text-accent transition-colors">{workflow.title}</CardTitle>
                <CardDescription>{workflow.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {toolStatus && (!toolStatus.ffmpegAvailable || !toolStatus.ffprobeAvailable) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle>FFmpeg Tools Not Ready</CardTitle>
            <CardDescription>
              Muvlo needs both `ffmpeg` and `ffprobe` on your system path before jobs can run.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
