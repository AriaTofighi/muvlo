import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  ffmpegPath: string;
  outputDirectory: string;
  theme: "system" | "dark" | "light";
  checkFfmpegOnStartup: boolean;
  setFfmpegPath: (path: string) => void;
  setOutputDirectory: (dir: string) => void;
  setTheme: (theme: "system" | "dark" | "light") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ffmpegPath: "bundled", // 'bundled' means use Tauri app bundled binary
      outputDirectory: "",
      theme: "dark",
      checkFfmpegOnStartup: true,
      
      setFfmpegPath: (path) => set({ ffmpegPath: path }),
      setOutputDirectory: (dir) => set({ outputDirectory: dir }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "muvlo-settings",
    }
  )
);
