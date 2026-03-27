import { create } from "zustand";

export interface WorkspaceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
}

export interface RecentWorkspaceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
  addedAt: number;
}

interface WorkspaceStore {
  activeFile: WorkspaceFile | null;
  mergeFiles: WorkspaceFile[];
  subtitleFile: WorkspaceFile | null;
  recentFiles: RecentWorkspaceFile[];
  setActiveFile: (file: File) => void;
  clearActiveFile: () => void;
  addMergeFile: (file: File) => void;
  useActiveFileForMerge: () => void;
  removeMergeFile: (id: string) => void;
  clearMergeFiles: () => void;
  setSubtitleFile: (file: File) => void;
  clearSubtitleFile: () => void;
}

const toWorkspaceFile = (file: File): WorkspaceFile => ({
  id: Math.random().toString(36).substring(2, 9),
  name: file.name,
  size: file.size,
  type: file.type,
  lastModified: file.lastModified,
  file,
});

const toRecentFile = (workspaceFile: WorkspaceFile): RecentWorkspaceFile => ({
  id: workspaceFile.id,
  name: workspaceFile.name,
  size: workspaceFile.size,
  type: workspaceFile.type,
  lastModified: workspaceFile.lastModified,
  file: workspaceFile.file,
  addedAt: Date.now(),
});

const isSameFile = (left: Pick<WorkspaceFile, "name" | "size" | "lastModified">, right: Pick<WorkspaceFile, "name" | "size" | "lastModified">) =>
  left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;

const pushRecentFile = (
  recentFiles: RecentWorkspaceFile[],
  workspaceFile: WorkspaceFile,
): RecentWorkspaceFile[] => {
  const nextRecent = toRecentFile(workspaceFile);

  return [
    nextRecent,
    ...recentFiles.filter((recentFile) => !isSameFile(recentFile, workspaceFile)),
  ].slice(0, 6);
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeFile: null,
  mergeFiles: [],
  subtitleFile: null,
  recentFiles: [],
  setActiveFile: (file) => {
    const workspaceFile = toWorkspaceFile(file);

    set((state) => ({
      activeFile: workspaceFile,
      recentFiles: pushRecentFile(state.recentFiles, workspaceFile),
    }));
  },
  clearActiveFile: () => {
    set({ activeFile: null });
  },
  addMergeFile: (file) => {
    const workspaceFile = toWorkspaceFile(file);

    set((state) => ({
      mergeFiles: state.mergeFiles.some((existingFile) => isSameFile(existingFile, workspaceFile))
        ? state.mergeFiles
        : [...state.mergeFiles, workspaceFile],
      recentFiles: pushRecentFile(state.recentFiles, workspaceFile),
    }));
  },
  useActiveFileForMerge: () => {
    const { activeFile } = get();
    if (!activeFile) {
      return;
    }

    set((state) => ({
      mergeFiles: state.mergeFiles.some((existingFile) => isSameFile(existingFile, activeFile))
        ? state.mergeFiles
        : [...state.mergeFiles, activeFile],
    }));
  },
  removeMergeFile: (id) => {
    set((state) => ({
      mergeFiles: state.mergeFiles.filter((file) => file.id !== id),
    }));
  },
  clearMergeFiles: () => {
    set({ mergeFiles: [] });
  },
  setSubtitleFile: (file) => {
    const workspaceFile = toWorkspaceFile(file);

    set((state) => ({
      subtitleFile: workspaceFile,
      recentFiles: pushRecentFile(state.recentFiles, workspaceFile),
    }));
  },
  clearSubtitleFile: () => {
    set({ subtitleFile: null });
  },
}));
