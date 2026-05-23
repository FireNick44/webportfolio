"use client";

import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/store/useAppStore";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { atLeast } from "@/lib/outro/tiers";
import { cn } from "@/lib/utils";
import { ClassicBackdrop } from "./ClassicBackdrop";
import { DeepScene } from "./DeepScene";
import { ReefScene } from "./ReefScene";
import { OutroContent } from "./OutroContent";
import { SceneCursor } from "./SceneCursor";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  const scene = useAppStore((s) => s.outroScene);
  const tier = useGraphicsTier();
  const underwater = scene === "deep" || scene === "reef";
  const customCursor = underwater && atLeast(tier, "high");

  return (
    <footer
      className={cn(
        "relative isolate min-h-[clamp(46rem,82vh,64rem)] overflow-hidden text-[#f5f0e6]",
        customCursor && "cursor-none",
      )}
    >
      {scene === "deep" ? (
        <DeepScene />
      ) : scene === "reef" ? (
        <ReefScene />
      ) : (
        <ClassicBackdrop />
      )}
      {/* Soft scrim behind the text so swimming creatures never hurt legibility. */}
      {underwater && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[55%] bg-gradient-to-b from-[#03121d]/45 to-transparent"
        />
      )}
      <OutroContent dict={dict} />
      {customCursor && <SceneCursor />}
    </footer>
  );
}
