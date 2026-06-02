"use client";

import { ReactNode, useEffect } from "react";

import { applyTokenOverrides } from "@/lib/theme/applyTokenOverrides";
import { useAppStore, STORAGE_KEY } from "@/lib/store/useAppStore";

export default function AppStateProvider({
  children,
  lang,
}: {
  children: ReactNode;
  lang: string;
}) {
  const theme = useAppStore((s) => s.theme);
  const themeMode = useAppStore((s) => s.themeMode);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const tokenOverrides = useAppStore((s) => s.tokenOverrides);

  useEffect(() => {
    setLanguage(lang);
  }, [lang, setLanguage]);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform:
          (navigator as Navigator & { platform?: string }).platform || "unknown",
        language: navigator.language,
        screen: { width: window.screen.width, height: window.screen.height },
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [setDeviceInfo]);

  useEffect(() => {
    try {
      const persisted =
        typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
      if (!persisted) setTheme("dark");
    } catch {
      /* ignore */
    }
  }, [setTheme]);

  // Apply persisted/live design-token overrides (theme presets + token editor)
  // as inline custom properties on <html>, overriding the globals.css defaults.
  useEffect(() => {
    applyTokenOverrides(tokenOverrides);
  }, [tokenOverrides]);

  // <html> lives in the root layout now; keep its theme + lang attributes synced
  // here (the anti-flash script sets the initial data-theme before paint).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // "device" mode follows the OS colour-scheme live: sync once and keep the
  // store's resolved `theme` in step with prefers-color-scheme changes (the
  // effect above then pushes it to data-theme). Only active while mode=device.
  useEffect(() => {
    if (themeMode !== "device" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setTheme(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [themeMode, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  // `?shuffle=<seed>` (reproduce an exact shared look) or bare `?shuffle` →
  // apply the random theme once per fresh load. Bare `?shuffle` is session-
  // guarded so a refresh doesn't re-roll; a seeded value always rebuilds that
  // seed (shareable links). Legacy `#shuffle=<seed>` hashes are still honoured.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rawSeed: string | null | undefined;
    const params = new URLSearchParams(window.location.search);
    if (params.has("shuffle")) {
      rawSeed = params.get("shuffle") || undefined; // "" → bare ?shuffle
    } else {
      const m = window.location.hash.match(/^#shuffle(?:=([0-9a-z]+))?$/i);
      if (!m) return;
      rawSeed = m[1] || undefined;
    }
    const seed = rawSeed ? parseInt(rawSeed, 36) : undefined;
    if (seed === undefined || Number.isNaN(seed)) {
      // Bare / unparseable — random, only once per session.
      try {
        if (sessionStorage.getItem("ys-shuffled")) return;
        sessionStorage.setItem("ys-shuffled", "1");
      } catch {
        /* ignore */
      }
    }
    import("@/lib/theme/shuffleTheme").then(({ shuffleTheme }) => {
      shuffleTheme(Number.isNaN(seed as number) ? undefined : seed);
    });
  }, []);

  return <>{children}</>;
}
