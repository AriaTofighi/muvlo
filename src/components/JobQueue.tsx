import { useJobStore } from "@/stores/jobStore";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ListVideo, Play, Trash2, XCircle, CheckCircle2 } from "lucide-react";

export function JobQueue() {
  const { jobs, removeJob, clearCompleted, startJob, startAllIdle, cancelJob } = useJobStore();

  return (
    <Sheet>
      <SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}>
        <ListVideo className="h-4 w-4" />
        {jobs.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            {jobs.length}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[400px] sm:h-[500px]">
        <SheetHeader className="mb-4 flex flex-row items-center justify-between pr-14">
          <div>
            <SheetTitle>Job Queue</SheetTitle>
            <SheetDescription>Manage background conversion and processing tasks.</SheetDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              disabled={!jobs.some((job) => ["completed", "cancelled"].includes(job.status))}
            >
              Clear Completed
            </Button>
            <Button size="sm" onClick={() => void startAllIdle()} disabled={!jobs.some((job) => job.status === "idle")}>
              <Play className="mr-2 h-4 w-4" /> Start All
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[300px] pr-4">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ListVideo className="h-8 w-8 mb-2 opacity-50" />
              <p>Queue is empty</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{job.fileName}</span>
                    <span className="text-xs text-muted-foreground">{job.workflow}</span>
                    {job.phase && <span className="text-xs text-muted-foreground/80">{job.phase}</span>}
                    {job.error && <span className="text-xs text-destructive">{job.error}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === "idle" && (
                      <Button variant="ghost" size="icon-sm" onClick={() => void startJob(job.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {job.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {["failed", "cancelled"].includes(job.status) && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    {job.status === "running" && (
                      <Button variant="ghost" size="icon-sm" onClick={() => void cancelJob(job.id)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}

                    <Button variant="ghost" size="icon-sm" onClick={() => removeJob(job.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {job.status === "running" && (
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-mono">{job.progress}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
