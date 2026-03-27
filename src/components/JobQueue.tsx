import { useJobStore } from "@/stores/jobStore";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ListVideo, Play, Trash2, XCircle, CheckCircle2, Folder, Loader2 } from "lucide-react";
import { revealInExplorer } from "@/lib/media-client";

export function JobQueue() {
  const { jobs, removeJob, clearCompleted, startJob, startAllIdle, cancelJob } = useJobStore();

  return (
    <Sheet>
      <SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}>
        <ListVideo className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
        {jobs.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
            {jobs.length}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col h-[60dvh] pb-6">
        <SheetHeader className="mb-4 flex flex-row items-center justify-between pr-12">
          <div className="flex flex-col gap-1 text-left">
            <SheetTitle className="text-xl">Job Queue</SheetTitle>
            <SheetDescription className="text-sm">Manage background conversion and processing tasks.</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={clearCompleted}
              disabled={!jobs.some((job) => ["completed", "cancelled"].includes(job.status))}
            >
              Clear Completed
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => void startAllIdle()}
              disabled={!jobs.some((job) => job.status === "idle")}
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Start All
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground/60">
              <ListVideo className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Queue is empty</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm transition-all hover:bg-card/80 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <span className="truncate font-medium text-sm text-foreground/90">{job.fileName}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize font-medium text-foreground/70">{job.workflow}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="capitalize flex items-center gap-1.5">
                        {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        {job.status === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {job.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        {job.status}
                      </span>
                      {job.phase && job.phase.toLowerCase() !== job.status.toLowerCase() && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-muted-foreground/80">{job.phase}</span>
                        </>
                      )}
                    </div>
                    {job.error && <span className="text-xs text-destructive mt-0.5">{job.error}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-80 transition-opacity hover:opacity-100">
                    {job.status === "idle" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => void startJob(job.id)} title="Start">
                        <Play className="h-4 w-4 fill-current" />
                      </Button>
                    )}
                    {job.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => {
                          const path = job.outputPath || ("outputPath" in job.request.payload ? job.request.payload.outputPath : null);
                          if (path) {
                            void revealInExplorer(path as string);
                          }
                        }}
                        title="Open folder"
                      >
                        <Folder className="h-4 w-4" />
                      </Button>
                    )}
                    {job.status === "running" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => void cancelJob(job.id)} title="Cancel">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeJob(job.id)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {job.status === "running" && (
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">{job.progress}%</span>
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
