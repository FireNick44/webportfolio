"use client";

import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/store/useAppStore";
import { ClassicBackdrop } from "./ClassicBackdrop";
import { DeepScene } from "./DeepScene";
import { OutroContent } from "./OutroContent";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  const scene = useAppStore((s) => s.outroScene);

  return (
    <footer className="relative isolate overflow-hidden text-[#f5f0e6]">
      {scene === "deep" ? <DeepScene /> : <ClassicBackdrop />}
      <OutroContent dict={dict} />
    </footer>
  );
}
