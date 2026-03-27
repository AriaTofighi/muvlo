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

    const setup = async () => {
      unlistenProgress = await listenToJobProgress(applyProgress);
      unlistenComplete = await listenToJobComplete((event) => {
        applyCompletion(event);

        if (!event.success) {
          toast.error(event.error ?? "Job failed.");
        }
      });
    };

    void setup();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, [applyCompletion, applyProgress]);
}
