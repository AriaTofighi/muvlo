import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Preset {
  id: string;
  name: string;
  workflow: string;
  format: string;
  settings: Record<string, any>;
  isSystem?: boolean;
}

interface PresetStore {
  presets: Preset[];
  addPreset: (preset: Omit<Preset, "id" | "isSystem">) => void;
  removePreset: (id: string) => void;
}

const DEFAULT_PRESETS: Preset[] = [
  { id: "sys-1", name: "Web Optimized (H.264)", workflow: "Convert", format: "mp4", settings: { preset: "fast", crf: 23 }, isSystem: true },
  { id: "sys-2", name: "High Quality Archive", workflow: "Convert", format: "mkv", settings: { preset: "slow", crf: 18 }, isSystem: true },
  { id: "sys-3", name: "Audio Only (Podcast)", workflow: "Extract Audio", format: "mp3", settings: { bitrate: "192k" }, isSystem: true },
];

export const usePresetStore = create<PresetStore>()(
  persist(
    (set) => ({
      presets: DEFAULT_PRESETS,
      addPreset: (preset) =>
        set((state) => ({
          presets: [...state.presets, { ...preset, id: Math.random().toString(36).substring(2, 9) }],
        })),
      removePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id || p.isSystem),
        })),
    }),
    {
      name: "muvlo-presets",
    }
  )
);
