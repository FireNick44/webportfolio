import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STORAGE_KEY = "noel-portfolio-v1";

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screen: { width: number; height: number };
}

interface AppState {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  /** Active theme preset name (e.g. "lab-dark", "mocha"); null = no preset. */
  preset: string | null;
  setPreset: (preset: string | null) => void;
  /** Per-token live overrides written from the settings token editor. */
  tokenOverrides: Record<string, string>;
  setTokenOverride: (token: string, value: string) => void;
  setTokenOverrides: (overrides: Record<string, string>) => void;
  clearTokenOverrides: () => void;
  language: string;
  setLanguage: (language: string) => void;
  deviceInfo: DeviceInfo | null;
  setDeviceInfo: (info: DeviceInfo) => void;
  isHeroLoaded: boolean;
  setIsHeroLoaded: (loaded: boolean) => void;
  hasShownLoader: boolean;
  setHasShownLoader: (shown: boolean) => void;
  /** Advanced/diagnostic mode: hides the rack's top wave + shows physics debug. */
  advanced: boolean;
  setAdvanced: (advanced: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      preset: null,
      setPreset: (preset) => set({ preset }),
      tokenOverrides: {},
      setTokenOverride: (token, value) =>
        set((s) => ({ tokenOverrides: { ...s.tokenOverrides, [token]: value } })),
      setTokenOverrides: (overrides) => set({ tokenOverrides: overrides }),
      clearTokenOverrides: () => set({ tokenOverrides: {} }),
      language: "en",
      setLanguage: (language) => set({ language }),
      deviceInfo: null,
      setDeviceInfo: (info) => set({ deviceInfo: info }),
      isHeroLoaded: false,
      setIsHeroLoaded: (loaded) => set({ isHeroLoaded: loaded }),
      hasShownLoader: false,
      setHasShownLoader: (shown) => set({ hasShownLoader: shown }),
      advanced: false,
      setAdvanced: (advanced) => set({ advanced }),
    }),
    {
      name: STORAGE_KEY,
      // hasShownLoader intentionally NOT persisted — the loader shows on every
      // fresh page load (resets per full load), not on client-side navigation.
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        preset: state.preset,
        tokenOverrides: state.tokenOverrides,
        advanced: state.advanced,
      }),
    },
  ),
);
