import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Link, useNavigate } from "react-router-dom";
import { FileVideo, Scissors, Minimize, Combine, Music, Type } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function Home() {
  const navigate = useNavigate();
  const { recentFiles, setActiveFile } = useWorkspaceStore();

  const handleFile = (file: File) => {
    setActiveFile(file);
    navigate("/convert");
  };

  const WORKFLOWS = [
    { title: "Convert", desc: "Change formats", path: "/convert", icon: FileVideo },
    { title: "Trim", desc: "Cut video length", path: "/trim", icon: Scissors },
    { title: "Compress", desc: "Reduce file size", path: "/compress", icon: Minimize },
    { title: "Merge", desc: "Join multiple files", path: "/merge", icon: Combine },
    { title: "Extract Audio", desc: "Save track to MP3", path: "/extract-audio", icon: Music },
    { title: "Subtitles", desc: "Add or burn subs", path: "/subtitles", icon: Type },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center mt-8">
        <h2 className="text-4xl font-bold tracking-tight">Welcome to Muvlo</h2>
        <p className="text-muted-foreground text-lg">Drop a media file to begin, or select a workflow.</p>
      </div>

      <FileDropZone onFileSelect={handleFile} />

      {recentFiles.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>Jump back into files added during this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentFiles.map((file) => (
              <button
                key={file.id}
                className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-left transition hover:border-accent hover:bg-accent/5"
                onClick={() => {
                  setActiveFile(file.file);
                  navigate("/convert");
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                <span className="ml-4 shrink-0 text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {WORKFLOWS.map((wf) => (
          <Link key={wf.path} to={wf.path}>
            <Card className="hover:border-accent hover:bg-accent/5 transition-all cursor-pointer h-full border-border/50">
              <CardHeader>
                <wf.icon className="h-6 w-6 text-accent mb-2" />
                <CardTitle>{wf.title}</CardTitle>
                <CardDescription>{wf.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
