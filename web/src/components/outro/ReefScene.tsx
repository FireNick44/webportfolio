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
  low: 26,
  medium: 44,
  high: 68,
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

      {/* Background kelp patch — behind the sand floor (rooted look). */}
      <Kelp
        animated={animated}
        clusterAround={70}
        className="absolute inset-x-0 bottom-0 z-[2] h-[42%]"
      />

      {/* Floor: colourful ByeSand waves BEHIND; the generated pixel sand IN
          FRONT at the very bottom, shorter so the wave crests still show above
          it (its wavy mask top means no hard cut over the waves). */}
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] block h-[clamp(90px,12vw,150px)] w-full opacity-95" />
      <SandFloor rows={5} className="absolute inset-x-0 bottom-0 z-[4]" />

      {/* Foreground kelp — bigger, in front of the floor, and darker, so the
          viewer peers THROUGH near kelp (its own seed → distinct from the back patch). */}
      <Kelp
        animated={animated}
        seed={5}
        count={7}
        scaleMul={1.9}
        clusterAround={26}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[52%] brightness-[0.55]"
      />

      {cursorOn && <CursorFollower pointer={pointer} />}
    </div>
  );
}
