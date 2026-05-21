import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screen: {
    width: number;
    height: number;
  };
}

interface AppState {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  deviceInfo: DeviceInfo | null;
  setDeviceInfo: (info: DeviceInfo) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      deviceInfo: null,
      setDeviceInfo: (info) => set({ deviceInfo: info }),
    }),
    {
      name: "webportfolio-storage",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
