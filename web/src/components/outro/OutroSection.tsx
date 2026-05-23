"use client";

import type { Dictionary } from "@/i18n/types";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { ReefScene } from "./ReefScene";
import { OutroContent } from "./OutroContent";
import { OutroFooterBar } from "./OutroFooterBar";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  return (
    <footer className="relative text-[#f5f0e6]">
      {/* Underwater block: wavy transition in, the reef scene, and the thanks text. */}
      <div className="relative isolate min-h-[clamp(40rem,75vh,58rem)] overflow-hidden">
        <ReefScene />
        {/* Soft scrim behind the text so swimming creatures never hurt legibility. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[55%] bg-gradient-to-b from-[#03121d]/45 to-transparent"
        />
        {/* Animated wavy transition from the section above into the water. */}
        <WaveDivider
          fill="var(--background)"
          flip
          seed={3}
          className="absolute inset-x-0 top-0 z-[15]"
        />
        <OutroContent dict={dict} />
      </div>

      {/* Licensing strip "under the sand". */}
      <OutroFooterBar dict={dict} />
    </footer>
  );
}
