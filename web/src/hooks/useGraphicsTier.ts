"use client";

import { useEffect, useState } from "react";

import { resolveGraphicsTier, type GraphicsTier } from "@/lib/outro/tiers";
import { useAppStore } from "@/store/useAppStore";

/** The effective scene tier: the user's choice, capped by device + reduced-motion. */
export function useGraphicsTier(): GraphicsTier {
  const selected = useAppStore((s) => s.graphicsTier);
  const [env, setEnv] = useState({ reducedMotion: false, hasFinePointer: true });

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fp = window.matchMedia("(any-pointer: fine)");
    const update = () =>
      setEnv({ reducedMotion: rm.matches, hasFinePointer: fp.matches });
    update();
    rm.addEventListener("change", update);
    fp.addEventListener("change", update);
    return () => {
      rm.removeEventListener("change", update);
      fp.removeEventListener("change", update);
    };
  }, []);

  return resolveGraphicsTier(selected, env);
}
