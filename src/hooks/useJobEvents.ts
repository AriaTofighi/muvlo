import { useEffect } from "react";
import { hasTauriRuntime, listenToJobComplete, listenToJobProgress } from "@/lib/media-client";
import { useJobStore } from "@/stores/jobStore";

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
      unlistenComplete = await listenToJobComplete(applyCompletion);
    };

    void setup();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, [applyCompletion, applyProgress]);
}
