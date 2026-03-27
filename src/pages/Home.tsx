import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileVideo, Scissors, Minimize, Combine, Music, Type } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getMediaToolStatus, hasTauriRuntime } from "@/lib/media-client";
import { formatFileSize } from "@/lib/media-helpers";
import type { MediaToolStatus } from "@/lib/media-types";
import { toast } from "sonner";

export function Home() {
  const navigate = useNavigate();
  const { recentFiles, selectActiveFile, activeFile } = useWorkspaceStore();
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

  const workflows = [
    { title: "Convert", desc: "Change formats", path: "/convert", icon: FileVideo },
    { title: "Trim", desc: "Cut video length", path: "/trim", icon: Scissors },
    { title: "Compress", desc: "Reduce file size", path: "/compress", icon: Minimize },
    { title: "Merge", desc: "Join multiple files", path: "/merge", icon: Combine },
    { title: "Extract Audio", desc: "Save track to MP3", path: "/extract-audio", icon: Music },
    { title: "Subtitles", desc: "Add or burn subs", path: "/subtitles", icon: Type },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Welcome to Muvlo</h2>
        <p className="text-lg text-muted-foreground">Choose a source file to begin.</p>
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
          <CardDescription>{activeFile ? activeFile.name : "Open a source file to begin."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropZone
            onBrowse={() => {
              void handleBrowse().catch((error) => {
                toast.error(error instanceof Error ? error.message : "Failed to open file picker.");
              });
            }}
            label="Open a source file from disk"
            hint={
              tauriReady
                ? "Use the native file picker so FFmpeg can access the real path."
                : "Tauri runtime not detected. Launch with `npm run tauri dev` instead of `npm run dev`."
            }
          />
          {activeFile && (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Current source: <span className="font-medium text-foreground">{activeFile.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {recentFiles.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>Resume a file imported during this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentFiles.map((file) => (
              <button
                key={file.path}
                className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-left transition hover:border-accent hover:bg-accent/5"
                onClick={() => void selectActiveFile(file).then(() => navigate("/convert"))}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                <span className="ml-4 shrink-0 text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Link key={workflow.path} to={workflow.path}>
            <Card className="h-full border-border/60 transition hover:border-accent hover:bg-accent/5">
              <CardHeader>
                <workflow.icon className="mb-2 h-6 w-6 text-accent" />
                <CardTitle>{workflow.title}</CardTitle>
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
