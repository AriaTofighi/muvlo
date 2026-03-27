import { create } from "zustand";
import { getMediaInfo } from "@/lib/media-client";
import type { MediaInfo, SelectedFile } from "@/lib/media-types";

export interface WorkspaceFile extends SelectedFile {
  mediaInfo?: MediaInfo | null;
  infoStatus: "idle" | "loading" | "ready" | "error";
  infoError?: string | null;
}

export interface RecentWorkspaceFile extends SelectedFile {
  addedAt: number;
}

interface WorkspaceStore {
  activeFile: WorkspaceFile | null;
  mergeFiles: SelectedFile[];
  subtitleFile: SelectedFile | null;
  recentFiles: RecentWorkspaceFile[];
  selectActiveFile: (file: SelectedFile) => Promise<void>;
  refreshActiveFileInfo: () => Promise<void>;
  clearActiveFile: () => void;
  addMergeFiles: (files: SelectedFile[]) => void;
  addMergeFile: (file: SelectedFile) => void;
  useActiveFileForMerge: () => void;
  removeMergeFile: (path: string) => void;
  clearMergeFiles: () => void;
  setSubtitleFile: (file: SelectedFile) => void;
  clearSubtitleFile: () => void;
}

const sameFile = (
  left: Pick<SelectedFile, "path">,
  right: Pick<SelectedFile, "path">,
) => left.path === right.path;

const pushRecentFiles = (
  recentFiles: RecentWorkspaceFile[],
  files: SelectedFile[],
) => {
  const nextItems = files.map((file) => ({
    ...file,
    addedAt: Date.now(),
  }));

  return [
    ...nextItems,
    ...recentFiles.filter((recentFile) =>
      nextItems.every((nextItem) => !sameFile(recentFile, nextItem)),
    ),
  ].slice(0, 8);
};

const enrichWithMediaInfo = async (file: SelectedFile): Promise<WorkspaceFile> => {
  try {
    const mediaInfo = await getMediaInfo(file.path);

    return {
      ...file,
      mediaInfo,
      infoStatus: "ready",
      infoError: null,
    };
  } catch (error) {
    return {
      ...file,
      mediaInfo: null,
      infoStatus: "error",
      infoError: error instanceof Error ? error.message : "Failed to load media info.",
    };
  }
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeFile: null,
  mergeFiles: [],
  subtitleFile: null,
  recentFiles: [],
  selectActiveFile: async (file) => {
    set((state) => ({
      activeFile: {
        ...file,
        mediaInfo: null,
        infoStatus: "loading",
        infoError: null,
      },
      recentFiles: pushRecentFiles(state.recentFiles, [file]),
    }));

    const enrichedFile = await enrichWithMediaInfo(file);

    set((state) => ({
      activeFile:
        state.activeFile && sameFile(state.activeFile, file)
          ? enrichedFile
          : state.activeFile,
    }));
  },
  refreshActiveFileInfo: async () => {
    const activeFile = get().activeFile;
    if (!activeFile) {
      return;
    }

    set({
      activeFile: {
        ...activeFile,
        infoStatus: "loading",
        infoError: null,
      },
    });

    const refreshedFile = await enrichWithMediaInfo(activeFile);

    set((state) => ({
      activeFile:
        state.activeFile && sameFile(state.activeFile, activeFile)
          ? refreshedFile
          : state.activeFile,
    }));
  },
  clearActiveFile: () => {
    set({ activeFile: null });
  },
  addMergeFiles: (files) => {
    set((state) => ({
      mergeFiles: [
        ...state.mergeFiles,
        ...files.filter((file) =>
          state.mergeFiles.every((existingFile) => !sameFile(existingFile, file)),
        ),
      ],
      recentFiles: pushRecentFiles(state.recentFiles, files),
    }));
  },
  addMergeFile: (file) => {
    get().addMergeFiles([file]);
  },
  useActiveFileForMerge: () => {
    const activeFile = get().activeFile;
    if (!activeFile) {
      return;
    }

    get().addMergeFiles([activeFile]);
  },
  removeMergeFile: (path) => {
    set((state) => ({
      mergeFiles: state.mergeFiles.filter((file) => file.path !== path),
    }));
  },
  clearMergeFiles: () => {
    set({ mergeFiles: [] });
  },
  setSubtitleFile: (file) => {
    set((state) => ({
      subtitleFile: file,
      recentFiles: pushRecentFiles(state.recentFiles, [file]),
    }));
  },
  clearSubtitleFile: () => {
    set({ subtitleFile: null });
  },
}));
