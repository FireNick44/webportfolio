"use client";

import { createContext, useContext } from "react";

import type { SceneLoop } from "@/lib/outro/sceneLoop";

/** The reef's shared per-frame loop — see `lib/outro/sceneLoop.ts`. */
export const SceneLoopContext = createContext<SceneLoop | null>(null);

export function useSceneLoop(): SceneLoop {
  const loop = useContext(SceneLoopContext);
  if (!loop) {
    throw new Error("useSceneLoop must be used inside <ReefScene> (SceneLoopContext)");
  }
  return loop;
}
