import { useNavigate } from "react-router-dom";
import { pickInputFiles } from "@/lib/media-client";
import { MEDIA_FILTERS } from "@/lib/media-helpers";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface OpenSourceFileOptions {
  navigateTo?: string | null;
}

export function useSourceFileActions() {
  const navigate = useNavigate();
  const selectActiveFile = useWorkspaceStore((state) => state.selectActiveFile);

  const openSourceFile = async (options: OpenSourceFileOptions = {}) => {
    const [file] = await pickInputFiles({
      multiple: false,
      filters: MEDIA_FILTERS,
    });

    if (!file) {
      return null;
    }

    await selectActiveFile(file);

    if (options.navigateTo) {
      navigate(options.navigateTo);
    }

    return file;
  };

  return {
    openSourceFile,
  };
}
