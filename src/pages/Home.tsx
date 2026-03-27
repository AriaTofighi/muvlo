import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/FileDropZone";
import { Link, useNavigate } from "react-router-dom";
import { FileVideo, Scissors, Minimize, Combine, Music, Type } from "lucide-react";

export function Home() {
  const navigate = useNavigate();

  const handleFile = (file: File) => {
    // In a real app we might put this file in global state, then navigate
    console.log("File selected:", file.name);
    // For now, redirect to convert as a default workflow
    navigate("/convert", { state: { file } });
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
