import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Minimize, Square } from "lucide-react";
import { toast } from "sonner";

export function Compress() {
  const location = useLocation();
  const initialFile = location.state?.file as File | undefined;
  
  const [quality, setQuality] = useState([70]); // 0-100 scale for simplicity
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startCompression = () => {
    if (!initialFile) {
      toast.error("Please select a file first from the Dashboard.");
      return;
    }
    setIsCompressing(true);
    setProgress(0);
    toast.success(`Starting compression at ${quality[0]}% quality`);
    
    // Mock progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompressing(false);
          toast.success("Compression completed!");
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  const cancelCompression = () => {
    setIsCompressing(false);
    setProgress(0);
    toast("Compression cancelled");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Compress Media</h2>
        <p className="text-muted-foreground">Reduce file size while preserving as much quality as possible.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source File</CardTitle>
          <CardDescription>
            {initialFile ? initialFile.name : "Select a file from the Dashboard"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compression Level</CardTitle>
          <CardDescription>Balance between visual quality and final file size.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Slider 
            value={quality} 
            max={100} 
            step={1} 
            onValueChange={(val) => setQuality(val as number[])} 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Smallest Size (0%)</span>
            <span className="font-mono font-medium text-foreground">{quality[0]}% Quality</span>
            <span>Best Quality (100%)</span>
          </div>
        </CardContent>
      </Card>

      {isCompressing ? (
        <Card className="border-accent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Compressing...</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-end">
              <Button variant="destructive" onClick={cancelCompression}>
                <Square className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={startCompression} size="lg" disabled={!initialFile}>
            <Minimize className="mr-2 h-4 w-4" /> Start Compression
          </Button>
        </div>
      )}
    </div>
  );
}
