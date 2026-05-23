"use client";

import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/store/useAppStore";
import { ClassicBackdrop } from "./ClassicBackdrop";
import { DeepScene } from "./DeepScene";
import { ReefScene } from "./ReefScene";
import { OutroContent } from "./OutroContent";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  const scene = useAppStore((s) => s.outroScene);

  return (
    <footer className="relative isolate min-h-[clamp(46rem,82vh,64rem)] overflow-hidden text-[#f5f0e6]">
      {scene === "deep" ? (
        <DeepScene />
      ) : scene === "reef" ? (
        <ReefScene />
      ) : (
        <ClassicBackdrop />
      )}
      <OutroContent dict={dict} />
    </footer>
  );
}
