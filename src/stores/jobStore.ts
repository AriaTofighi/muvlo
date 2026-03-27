import { create } from "zustand";

export interface Job {
  id: string;
  fileName: string;
  workflow: "Convert" | "Trim" | "Compress" | "Merge" | "Extract Audio" | "Subtitles";
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
}

interface JobStore {
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "status" | "progress">) => string;
  startJob: (id: string) => void;
  startAllIdle: () => void;
  cancelJob: (id: string) => void;
  updateJobProgress: (id: string, progress: number) => void;
  setJobStatus: (id: string, status: Job["status"]) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
}

const timers = new Map<string, ReturnType<typeof setInterval>>();

const stopTimer = (id: string) => {
  const timer = timers.get(id);
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timers.delete(id);
};

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  addJob: (job) => {
    const id = Math.random().toString(36).substring(2, 9);

    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          ...job,
          id,
          status: "idle",
          progress: 0,
        },
      ],
    }));

    return id;
  },
  startJob: (id) => {
    stopTimer(id);

    const existingJob = get().jobs.find((job) => job.id === id);
    if (!existingJob) {
      return;
    }

    let progress = existingJob.progress;

    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "running",
            }
          : job,
      ),
    }));

    const timer = setInterval(() => {
      progress = Math.min(progress + 8, 100);
      get().updateJobProgress(id, progress);

      if (progress >= 100) {
        stopTimer(id);
        get().setJobStatus(id, "completed");
      }
    }, 300);

    timers.set(id, timer);
  },
  startAllIdle: () => {
    get()
      .jobs.filter((job) => job.status === "idle")
      .forEach((job) => get().startJob(job.id));
  },
  cancelJob: (id) => {
    stopTimer(id);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "cancelled",
            }
          : job,
      ),
    }));
  },
  updateJobProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, progress } : j)),
    })),
  setJobStatus: (id, status) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),
  removeJob: (id) => {
    stopTimer(id);
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
  },
  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter((j) => !["completed", "cancelled"].includes(j.status)),
    })),
}));
