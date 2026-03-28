import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { revealInExplorer } from "@/lib/media-client";
import { useJobStore } from "@/stores/jobStore";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { ListVideo, CheckCircle2, Folder, Loader2, Play, Trash2, XCircle } from "lucide-react";

export function JobQueue() {
  const { jobs, clearCompleted, startAllIdle, startJob, cancelJob, removeJob } = useJobStore();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sheet>
      <SheetTrigger
        render={
          <SidebarMenuButton tooltip="Job Queue" className="relative group/job-queue">
            <ListVideo className="h-4 w-4" />
            {!collapsed && <span>Job Queue</span>}
            {jobs.length > 0 && (
              <span className={collapsed ? "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm" : "absolute right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm"}>
                {jobs.length}
              </span>
            )}
          </SidebarMenuButton>
        }
      />
      <SheetContent
        side="bottom"
        className="flex flex-col overflow-hidden pb-6"
      >
        <SheetHeader className="mb-4 flex flex-row items-center justify-between pr-12">
          <SheetTitle className="text-left text-xl">Job Queue</SheetTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={clearCompleted}
              disabled={
                !jobs.some((job) =>
                  ["completed", "cancelled"].includes(job.status),
                )
              }
            >
              Clear Completed
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => void startAllIdle()}
              disabled={!jobs.some((job) => job.status === "idle")}
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
              Start All
            </Button>
          </div>
        </SheetHeader>

        <div className="max-h-[min(56dvh,36rem)] overflow-y-auto px-4">
          <div className="space-y-3 pb-1">
            {jobs.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-xl bg-card/60 p-4">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="invisible flex flex-col items-center gap-1.5"
                  >
                    <span className="text-sm font-medium">
                      Queue is empty
                    </span>
                    <span className="text-xs">placeholder</span>
                  </div>
                  <div className="absolute inset-0 flex items-center">
                    <span className="text-sm font-medium text-foreground/75">
                      Queue is empty
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-xl bg-card/60 p-4 transition-all hover:bg-card/80"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground/90">
                        {job.fileName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize font-medium text-foreground/70">
                          {job.workflow}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="flex items-center gap-1.5 capitalize">
                          {job.status === "completed" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          )}
                          {job.status === "failed" && (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          {job.status === "running" && (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          )}
                          {job.status}
                        </span>
                        {job.phase &&
                          job.phase.toLowerCase() !==
                            job.status.toLowerCase() && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-muted-foreground/80">
                                {job.phase}
                              </span>
                            </>
                          )}
                      </div>
                      {job.error && (
                        <span className="mt-0.5 text-xs text-destructive">
                          {job.error}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity hover:opacity-100">
                      {job.status === "idle" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          onClick={() => void startJob(job.id)}
                          title="Start"
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                      )}
                      {job.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => {
                            const path =
                              job.outputPath ||
                              ("outputPath" in job.request.payload
                                ? job.request.payload.outputPath
                                : null);

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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void cancelJob(job.id)}
                          title="Cancel"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeJob(job.id)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {job.status === "running" && (
                    <div className="flex items-center gap-3">
                      <Progress value={job.progress} className="h-1.5 flex-1" />
                      <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                        {job.progress}%
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
