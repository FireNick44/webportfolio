"use client";

import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/store/useAppStore";
import { ClassicBackdrop } from "./ClassicBackdrop";
import { OutroContent } from "./OutroContent";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  const scene = useAppStore((s) => s.outroScene);

  return (
    <footer className="relative isolate overflow-hidden text-[#f5f0e6]">
      {scene === "deep" ? (
        // Temporary placeholder — replaced by <DeepScene /> in a later task.
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#062436]" />
      ) : (
        <ClassicBackdrop />
      )}
      <OutroContent dict={dict} />
    </footer>
  );
}
