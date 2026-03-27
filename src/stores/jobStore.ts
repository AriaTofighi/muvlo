import { create } from "zustand";

export interface Job {
  id: string;
  fileName: string;
  workflow: "Convert" | "Trim" | "Compress" | "Merge" | "Extract Audio" | "Subtitles";
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
}

interface JobStore {
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "status" | "progress">) => void;
  updateJobProgress: (id: string, progress: number) => void;
  setJobStatus: (id: string, status: Job["status"]) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  addJob: (job) =>
    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          ...job,
          id: Math.random().toString(36).substring(2, 9),
          status: "idle",
          progress: 0,
        },
      ],
    })),
  updateJobProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, progress } : j)),
    })),
  setJobStatus: (id, status) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),
  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.status !== "completed"),
    })),
}));
