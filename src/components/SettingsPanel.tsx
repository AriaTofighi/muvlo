import { useSettingsStore } from "@/stores/settingsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { ChevronDown, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect } from "react";
import { simulateJobFailure } from "@/lib/media-client";
import type { SimulatedFailureScenario } from "@/lib/media-types";
import { useJobStore } from "@/stores/jobStore";

const THEME_ITEMS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const FAILURE_SCENARIOS: Array<{
  value: SimulatedFailureScenario;
  label: string;
  fileName: string;
}> = [
  {
    value: "container_mismatch",
    label: "Container mismatch",
    fileName: "demo-container-mismatch.mkv",
  },
  {
    value: "encoder_unavailable",
    label: "Encoder unavailable",
    fileName: "demo-encoder-missing.mov",
  },
  {
    value: "permission_denied",
    label: "Permission denied",
    fileName: "demo-permission-error.mp4",
  },
  {
    value: "corrupt_input",
    label: "Corrupt input",
    fileName: "demo-corrupt-input.webm",
  },
] as const;

export function SettingsPanel() {
  const {
    ffmpegPath, setFfmpegPath,
    outputDirectory, setOutputDirectory,
    theme,
    setTheme: setStoredTheme,
  } = useSettingsStore();
  const enqueueJob = useJobStore((state) => state.enqueueJob);
  const { theme: activeTheme, setTheme } = useTheme();
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!activeTheme || activeTheme === theme) {
      return;
    }

    setTheme(theme);
  }, [activeTheme, theme, setTheme]);

  const handleThemeChange = (value: "system" | "dark" | "light") => {
    setStoredTheme(value);
    setTheme(value);
  };

  const handleSave = () => {
    toast.success("Settings saved successfully.");
  };

  const handleSimulateFailure = async (scenario: SimulatedFailureScenario, fileName: string) => {
    const jobId = crypto.randomUUID();

    enqueueJob({
      id: jobId,
      fileName,
      workflow: "Convert",
      request: {
        jobId,
        payload: {
          kind: "convert",
          inputPath: `C:\\simulated\\${fileName}`,
          outputPath: `C:\\simulated\\${fileName}.out`,
          format: "mp4",
          overwrite: true,
        },
      },
    });

    try {
      await simulateJobFailure(jobId, scenario);
      toast.success("Simulated failure queued.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to simulate job error.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <SidebarMenuButton tooltip="Settings">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </SidebarMenuButton>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>

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
            <Select
              value={theme}
              items={THEME_ITEMS}
              onValueChange={(value) => handleThemeChange(value as "system" | "dark" | "light")}
            >
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

          {isDev && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1.5 select-none text-sm font-medium text-foreground">
                <span>Development</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3 pl-0.5">
                <Label>Debug Error Simulation</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FAILURE_SCENARIOS.map((scenario) => (
                    <Button
                      key={scenario.value}
                      type="button"
                      variant="outline"
                      className="justify-start text-left"
                      onClick={() => void handleSimulateFailure(scenario.value, scenario.fileName)}
                    >
                      {scenario.label}
                    </Button>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
