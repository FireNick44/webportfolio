"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { ByeSand } from "@/components/layout/ByeSand";
import { WaterCanvas } from "./WaterCanvas";
import { CursorFollower } from "./CursorFollower";
import { Kelp } from "./Kelp";
import { SandFloor } from "./SandFloor";

// "Reef" = a combination of Classic + The Deep: the colourful ByeSand floor and
// the SVG bubble backdrop fused with the procedural canvas bubbles, kelp, and
// pixel-sand texture.
const BUBBLE_COUNT: Record<GraphicsTier, number> = {
  off: 0,
  low: 18,
  medium: 30,
  high: 52,
};

export function ReefScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = useGraphicsTier();
  const active = useSceneActive(containerRef);
  const animated = tier !== "off";
  const cursorOn = atLeast(tier, "medium") && active;
  const pointer = usePointerField(containerRef, cursorOn);

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* Back layer: the bubble SVG, kept bright so it reads through the canvas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(1.2) brightness(0.8)" }}
      />
      {/* Lighter wash than The Deep so the SVG bubbles stay visible behind the canvas. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b2a3a]/35 via-[#0e3346]/40 to-[#06212f]/60" />

      {/* Canvas bubbles stacked on top of the SVG for depth. */}
      <WaterCanvas
        active={active && animated}
        bubbleCount={BUBBLE_COUNT[tier]}
        pointer={pointer}
        enableCursor={cursorOn}
      />

      {/* Kelp gathered into one dense patch. */}
      <Kelp animated={animated} clusterAround={70} />

      {/* Floor: pixel-sand texture (back) + the colourful ByeSand waves on top
          (slightly translucent so the texture reads through and the top isn't cut off). */}
      <SandFloor />
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] block h-[clamp(80px,11vw,150px)] w-full opacity-90" />

      {/* Foreground kelp — bigger, in front of the floor, and darker, so the
          viewer peers THROUGH near kelp (its own seed → distinct from the back patch). */}
      <Kelp
        animated={animated}
        seed={5}
        count={7}
        scaleMul={1.9}
        clusterAround={26}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[68%] brightness-[0.55]"
      />

      {cursorOn && <CursorFollower pointer={pointer} />}
    </div>
  );
}
