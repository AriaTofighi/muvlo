import { useEffect } from "react";
import { hasTauriRuntime, listenToJobComplete, listenToJobProgress } from "@/lib/media-client";
import { useJobStore } from "@/stores/jobStore";
import { toast } from "sonner";

export function useJobEvents() {
  const applyProgress = useJobStore((state) => state.applyProgressEvent);
  const applyCompletion = useJobStore((state) => state.applyCompletionEvent);

  useEffect(() => {
    if (!hasTauriRuntime()) {
      return;
    }

    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;
    let disposed = false;

    const setup = async () => {
      const progressUnlisten = await listenToJobProgress(applyProgress);
      if (disposed) {
        progressUnlisten();
        return;
      }
      unlistenProgress = progressUnlisten;

      const completeUnlisten = await listenToJobComplete((event) => {
        applyCompletion(event);

        if (!event.success) {
          const job = useJobStore.getState().jobs.find((item) => item.id === event.jobId);
          toast.error(`${job?.workflow ?? "Job"} failed`, {
            description: summarizeJobError(event.error),
          });
        }
      });
      if (disposed) {
        completeUnlisten();
        return;
      }
      unlistenComplete = completeUnlisten;
    };

    void setup();

    return () => {
      disposed = true;
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, [applyCompletion, applyProgress]);
}

function summarizeJobError(error?: string | null) {
  if (!error) {
    return "Open Job Queue for the full error details.";
  }

  const firstMeaningfulLine = error
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) {
    return "Open Job Queue for the full error details.";
  }

  const compactLine = firstMeaningfulLine.replace(/\[[^\]]+\]\s*/g, "").trim();
  const normalized = compactLine.toLowerCase();

  if (
    normalized.includes("could not write header")
    || normalized.includes("nothing was written into output file")
    || normalized.includes("invalid argument")
  ) {
    return "The selected output format is incompatible with one or more streams or codec settings. Open Job Queue for details.";
  }

  if (normalized.includes("unknown encoder") || normalized.includes("encoder not found")) {
    return "A required encoder is not available on this system. Open Job Queue for details.";
  }

  if (normalized.includes("job cancelled")) {
    return "The job was cancelled before it finished.";
  }

  return compactLine.length > 140
    ? `${compactLine.slice(0, 137)}...`
    : compactLine;
}
