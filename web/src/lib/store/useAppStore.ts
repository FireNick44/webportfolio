import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STORAGE_KEY = "yannic-portfolio-v1";

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
  /** Game-style quality tier for the underwater scene. */
  graphicsTier: "off" | "low" | "medium" | "high";
  setGraphicsTier: (tier: "off" | "low" | "medium" | "high") => void;
  /** Live-tunable flask water alpha (0..1). The palette stores colours at 0.7;
   *  this overrides their alpha at render time so the technical panel can adjust
   *  it without rebuilding the layout. */
  liquidOpacity: number;
  setLiquidOpacity: (a: number) => void;
  /** When true, generateFlasks picks one of the three flask shapes (rect/round/
   *  cone) per bottle for visual variety. Off → all rectangular. */
  randomizeFlaskShapes: boolean;
  setRandomizeFlaskShapes: (v: boolean) => void;
  /** Bumped to ask the rack to re-seed its layout without a full reload —
   *  PhysicsScene watches this and reshuffles flasks/chains/anchors. Used by
   *  the "shuffle" notification + the #shuffle hash. */
  flaskShuffleCounter: number;
  bumpFlaskShuffleCounter: () => void;
  /** Rack interaction model — "drag" (default: grab + pull a flask) or
   *  "collide" (cursor acts as a physical pusher that bumps flasks around). */
  interactionMode: "drag" | "collide";
  setInteractionMode: (m: "drag" | "collide") => void;
  /** Advanced playground knob: by default a dragged flask passes through chains
   *  (no wedge), keeping flask↔flask collision intact. Turn ON to keep the
   *  chain bit too — fun to play with but lets you easily wedge things. */
  dragKeepsChainCollision: boolean;
  setDragKeepsChainCollision: (v: boolean) => void;
  /** Bumped to ask the boot loader to replay — covers the page in the current
   *  (just-changed) theme background so a theme swap doesn't read as a jarring
   *  in-place repaint. Used by the footer's "Shuffle + Top" button. */
  loaderShowRequest: number;
  requestLoader: () => void;
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
      graphicsTier: "medium",
      setGraphicsTier: (graphicsTier) => set({ graphicsTier }),
      liquidOpacity: 0.7,
      setLiquidOpacity: (liquidOpacity) => set({ liquidOpacity }),
      randomizeFlaskShapes: true,
      setRandomizeFlaskShapes: (randomizeFlaskShapes) =>
        set({ randomizeFlaskShapes }),
      flaskShuffleCounter: 0,
      bumpFlaskShuffleCounter: () =>
        set((s) => ({ flaskShuffleCounter: s.flaskShuffleCounter + 1 })),
      interactionMode: "drag",
      setInteractionMode: (interactionMode) => set({ interactionMode }),
      dragKeepsChainCollision: false,
      setDragKeepsChainCollision: (dragKeepsChainCollision) =>
        set({ dragKeepsChainCollision }),
      loaderShowRequest: 0,
      requestLoader: () =>
        set((s) => ({ loaderShowRequest: s.loaderShowRequest + 1 })),
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
        graphicsTier: state.graphicsTier,
        liquidOpacity: state.liquidOpacity,
        randomizeFlaskShapes: state.randomizeFlaskShapes,
        interactionMode: state.interactionMode,
        dragKeepsChainCollision: state.dragKeepsChainCollision,
      }),
    },
  ),
);
