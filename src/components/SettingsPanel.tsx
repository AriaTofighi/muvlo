import { useSettingsStore } from "@/stores/settingsStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export function SettingsPanel() {
  const { 
    ffmpegPath, setFfmpegPath, 
    outputDirectory, setOutputDirectory,
    theme, setTheme
  } = useSettingsStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const handleSave = () => {
    toast.success("Settings saved successfully.");
  };

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "icon" })}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure Muvlo preferences and ffmpeg system paths.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="ffmpeg-path">FFmpeg Binary Path</Label>
            <Input
              id="ffmpeg-path"
              value={ffmpegPath}
              onChange={(e) => setFfmpegPath(e.target.value)}
              placeholder="e.g. bundled, /usr/bin/ffmpeg, C:\ffmpeg\bin\ffmpeg.exe"
            />
            <p className="text-xs text-muted-foreground">Keep "bundled" to use the internal FFmpeg included with Muvlo.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="output-dir">Default Output Directory</Label>
            <div className="flex gap-2">
              <Input
                id="output-dir"
                value={outputDirectory}
                onChange={(e) => setOutputDirectory(e.target.value)}
                placeholder="Leave blank to save near source file..."
              />
              <Button variant="secondary">Browse</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Appearance</Label>
            <Select value={theme} onValueChange={(val: any) => val && setTheme(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
