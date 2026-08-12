import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      reduceMotion: false,
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: "gwak-settings" },
  ),
);
