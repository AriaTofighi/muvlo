import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { FolderOpen } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { JobQueue } from "@/components/JobQueue";
import { SettingsPanel } from "@/components/SettingsPanel";
import { formatDuration, formatFileSize, getMediaDurationSeconds } from "@/lib/media-helpers";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { toast } from "sonner";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Workspace",
    description: "Choose a source file to begin.",
  },
  "/convert": {
    title: "Convert",
    description: "Change container formats and save a new export.",
  },
  "/trim": {
    title: "Trim",
    description: "Cut the clip down to the exact range you need.",
  },
  "/compress": {
    title: "Compress",
    description: "Reduce file size.",
  },
  "/merge": {
    title: "Merge",
    description: "Build a sequence from multiple clips or audio files.",
  },
  "/extract-audio": {
    title: "Extract Audio",
    description: "Pull the soundtrack into its own file.",
  },
  "/subtitles": {
    title: "Subtitles",
    description: "Attach or burn captions into the export.",
  },
};

export function Header() {
  const location = useLocation();
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { openSourceFile } = useSourceFileActions();
  const pageMeta = PAGE_META[location.pathname] ?? PAGE_META["/"];

  const activeSummary = useMemo(() => {
    if (!activeFile) {
      return pageMeta.description;
    }

    const duration = formatDuration(getMediaDurationSeconds(activeFile.mediaInfo));
    return `${activeFile.name} | ${formatFileSize(activeFile.size)} | ${duration}`;
  }, [activeFile, pageMeta.description]);

  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] items-center gap-4 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur md:px-6">
      <SidebarTrigger className="sm:hidden" />
      <div className="min-w-0 flex-1">
        <h1 className="font-semibold text-xl tracking-tight">{pageMeta.title}</h1>
        <p className="truncate text-sm text-muted-foreground">{activeSummary}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="hidden sm:inline-flex"
          onClick={() => {
            void openSourceFile().catch((error) => {
              toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
            });
          }}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Open Source
        </Button>
        <JobQueue />
        <SettingsPanel />
      </div>
    </header>
  );
}
