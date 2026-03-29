import { Folder, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { revealInExplorer } from "@/lib/media-client";
import type { Job } from "@/stores/jobStore";

interface JobStatusCardProps {
  job: Job;
  outputPath?: string;
  onCancel: (id: string) => void | Promise<void>;
  labels?: {
    running?: string;
    completed?: string;
  };
}

export function JobStatusCard({ job, outputPath, onCancel, labels }: JobStatusCardProps) {
  if (job.status === "running") {
    return (
      <Card size="lg" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              {job.phase ?? labels?.running ?? "Processing"}...
            </span>
            <span className="font-mono font-bold">{Math.round(job.progress)}%</span>
          </div>
          <Progress value={job.progress} className="h-2" />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(job.id)}
              className="h-8 border-border/40 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground shadow-none hover:border-border/70 hover:bg-muted/40 hover:text-foreground"
            >
              <Square className="mr-2 h-3 w-3 fill-current" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (job.status === "completed") {
    const finalPath = job.outputPath ?? outputPath;

    return (
      <Card size="lg" className="bg-success/5 animate-in fade-in zoom-in-95 duration-500">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {labels?.completed ?? "Task completed"}
              </p>
              {finalPath && (
                <p className="truncate text-xs font-medium text-muted-foreground/80 mt-1">
                  {finalPath}
                </p>
              )}
            </div>
            {finalPath && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void revealInExplorer(finalPath)}
                className="shrink-0 h-8 border-border/40 hover:border-success/30 hover:bg-success/5 text-xs"
              >
                <Folder className="mr-2 h-3.5 w-3.5" /> Open Folder
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
