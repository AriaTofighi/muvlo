import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FormatPicker } from "@/components/FormatPicker";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";

export function Convert() {
  const location = useLocation();
  const initialFile = location.state?.file as File | undefined;
  
  const [format, setFormat] = useState("mp4");
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const startConversion = () => {
    if (!initialFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }
    setIsConverting(true);
    setProgress(0);
    toast.success(`Starting conversion to .${format}`);
    
    // Mock progress for UI purposes until IPC is hooked up fully
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsConverting(false);
          toast.success("Conversion completed successfully!");
          return 100;
        }
        return prev + 5;
      });
    }, 500);
  };

  const cancelConversion = () => {
    setIsConverting(false);
    setProgress(0);
    toast("Conversion cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Convert Media</h2>
        <p className="text-muted-foreground">Transcode your video or audio into a different format.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Media</CardTitle>
          <CardDescription>
            {initialFile ? initialFile.name : "No file selected. Go to Dashboard to select a file."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Output Format</span>
            <FormatPicker value={format} onChange={setFormat} />
          </div>
          {/* We will add Codec pickers here later depending on the selected format */}
        </CardContent>
      </Card>

      {isConverting ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Converting to {format}...</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={cancelConversion}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={startConversion} size="lg" disabled={!initialFile}>
            <Play className="mr-2 h-4 w-4" /> Start Conversion
          </Button>
        </div>
      )}
    </div>
  );
}
