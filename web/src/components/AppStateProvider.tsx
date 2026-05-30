"use client";

import { ReactNode, useEffect } from "react";

import { applyTokenOverrides } from "@/lib/themePresets";
import { useAppStore, STORAGE_KEY } from "@/lib/store/useAppStore";

export default function AppStateProvider({
  children,
  lang,
}: {
  children: ReactNode;
  lang: string;
}) {
  const theme = useAppStore((s) => s.theme);
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

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  // `#shuffle` (random) or `#shuffle=<seed>` (reproduce an exact shared look)
  // → apply once per fresh load. Bare #shuffle is session-guarded so a refresh
  // doesn't re-roll; a seeded hash always rebuilds that seed (shareable links).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const m = hash.match(/^#shuffle(?:=([0-9a-z]+))?$/i);
    if (!m) return;
    const seed = m[1] ? parseInt(m[1], 36) : undefined;
    if (seed === undefined) {
      // Bare #shuffle — random, only once per session.
      try {
        if (sessionStorage.getItem("ys-shuffled")) return;
        sessionStorage.setItem("ys-shuffled", "1");
      } catch {
        /* ignore */
      }
    }
    import("@/lib/shuffleTheme").then(({ shuffleTheme }) => {
      shuffleTheme(seed);
    });
  }, []);

  return <>{children}</>;
}
