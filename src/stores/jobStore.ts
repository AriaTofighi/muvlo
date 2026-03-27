import { create } from "zustand";
import { cancelMediaJob, startMediaJob } from "@/lib/media-client";
import type {
  JobCompleteEvent,
  JobProgressEvent,
  MediaJobRequest,
  WorkflowName,
} from "@/lib/media-types";

export interface Job {
  id: string;
  fileName: string;
  workflow: WorkflowName;
  request: MediaJobRequest;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  phase?: string | null;
  outputPath?: string | null;
  error?: string | null;
}

interface JobStore {
  jobs: Job[];
  enqueueJob: (job: Omit<Job, "status" | "progress" | "phase" | "outputPath" | "error">) => string;
  startJob: (id: string) => Promise<void>;
  startAllIdle: () => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  updateJobProgress: (id: string, progress: number) => void;
  setJobStatus: (id: string, status: Job["status"]) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  applyProgressEvent: (event: JobProgressEvent) => void;
  applyCompletionEvent: (event: JobCompleteEvent) => void;
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  enqueueJob: (job) => {
    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          ...job,
          status: "idle",
          progress: 0,
          phase: "Queued",
          outputPath: null,
          error: null,
        },
      ],
    }));

    return job.id;
  },
  startJob: async (id) => {
    const job = get().jobs.find((item) => item.id === id);
    if (!job) {
      return;
    }

    set((state) => ({
      jobs: state.jobs.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "running",
              phase: "Starting",
              error: null,
            }
          : item,
      ),
    }));

    try {
      await startMediaJob(job.request);
    } catch (error) {
      set((state) => ({
        jobs: state.jobs.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "failed",
                error: error instanceof Error ? error.message : "Failed to start job.",
              }
            : item,
        ),
      }));
    }
  },
  startAllIdle: async () => {
    const idleJobs = get().jobs.filter((job) => job.status === "idle");
    for (const job of idleJobs) {
      await get().startJob(job.id);
    }
  },
  cancelJob: async (id) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "cancelled",
              phase: "Cancelled",
            }
          : job,
      ),
    }));

    try {
      await cancelMediaJob(id);
    } catch (error) {
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id
            ? {
                ...job,
                status: "failed",
                error: error instanceof Error ? error.message : "Failed to cancel job.",
              }
            : job,
        ),
      }));
    }
  },
  updateJobProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              progress,
            }
          : job,
      ),
    })),
  setJobStatus: (id, status) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status,
            }
          : job,
      ),
    })),
  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter((job) => !["completed", "cancelled"].includes(job.status)),
    })),
  applyProgressEvent: (event) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === event.jobId
          ? {
              ...job,
              status: "running",
              phase: event.phase ?? job.phase,
              progress:
                event.progressPercent == null
                  ? job.progress
                  : Math.max(0, Math.min(100, event.progressPercent)),
            }
          : job,
      ),
    })),
  applyCompletionEvent: (event) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === event.jobId
          ? {
              ...job,
              status: event.success ? "completed" : "failed",
              phase: event.success ? "Completed" : "Failed",
              progress: event.success ? 100 : job.progress,
              outputPath: event.outputPath ?? job.outputPath,
              error: event.error ?? null,
            }
          : job,
      ),
    })),
}));
