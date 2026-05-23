"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { ByeSand } from "@/components/layout/ByeSand";
import { WaterCanvas } from "./WaterCanvas";
import { Octopus } from "./Octopus";
import { Coral } from "./Coral";
import { Rook } from "./Rook";
import { Kelp } from "./Kelp";
import { SandFloor } from "./SandFloor";

const BUBBLE_COUNT: Record<GraphicsTier, number> = {
  off: 0,
  low: 26,
  medium: 44,
  high: 68,
};

export function ReefScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = useGraphicsTier();
  const active = useSceneActive(containerRef);

  // Tier budget:
  //  - off: fully static.
  //  - low: SVG bg + static floor + cheap CSS sway. NO canvas, NO creatures.
  //  - medium: + canvas bubbles + creatures (octopus wanders, rook cruises).
  //  - high: + cursor interaction (octopus flees, bubbles scatter).
  const animated = tier !== "off"; // cheap CSS sway (kelp/coral)
  const heavy = atLeast(tier, "medium") && active; // canvas + creatures (rAF)
  const interactive = atLeast(tier, "high") && active; // cursor effects
  const pointer = usePointerField(containerRef, interactive);

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* Back: the bubble SVG, darkened/graded to read as the deep bottom. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(1.25) brightness(0.58) hue-rotate(8deg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05151f]/55 via-[#06212e]/66 to-[#010d16]/88" />

      {/* Canvas bubbles + creatures only from Medium up (Low falls back to the SVG). */}
      {heavy && (
        <WaterCanvas
          active={active}
          bubbleCount={BUBBLE_COUNT[tier]}
          pointer={pointer}
          enableCursor={interactive}
        />
      )}
      {heavy && <Rook />}

      {/* Floor: ByeSand waves (z3) → background kelp (z4) → pixel sand (z5) → coral. */}
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] block h-[clamp(90px,12vw,150px)] w-full opacity-95" />
      <Kelp
        animated={animated}
        clusterAround={70}
        scaleMul={1.4}
        className="absolute inset-x-0 bottom-0 z-[4] h-[55%]"
      />
      <SandFloor rows={5} className="absolute inset-x-0 bottom-0 z-[5]" />
      <Coral src="/underwater/coral_red_blue.png" leftPct={42} widthPx={132} animated={animated} />
      <Coral src="/underwater/coral_green.png" leftPct={82} widthPx={112} flip delay={1.4} animated={animated} />

      {/* Foreground kelp — bigger, darker, in front of everything (z6). */}
      <Kelp
        animated={animated}
        seed={5}
        count={7}
        scaleMul={1.9}
        clusterAround={26}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[52%] brightness-[0.55]"
      />

      {heavy && <Octopus pointer={pointer} />}
    </div>
  );
}
