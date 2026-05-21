import { useEffect, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";

export default function AppStateProvider({ children }: { children: ReactNode }) {
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);

  useEffect(() => {
    const update = () => {
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform:
          (navigator as Navigator & { platform?: string }).platform ?? "unknown",
        language: navigator.language,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [setDeviceInfo]);

  // Initialize theme from system preference if no persisted value
  useEffect(() => {
    const hasPersisted = localStorage.getItem("webportfolio-storage");
    if (!hasPersisted) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      useAppStore.getState().setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  return <>{children}</>;
}
