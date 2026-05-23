"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { ByeSand } from "@/components/layout/ByeSand";
import { WaterCanvas } from "./WaterCanvas";
import { CursorFollower } from "./CursorFollower";
import { Coral } from "./Coral";
import { Kelp } from "./Kelp";
import { SandFloor } from "./SandFloor";

// "Reef" = Classic + The Deep combined: SVG bubble backdrop + canvas bubbles,
// kelp, pixel-sand texture, the colourful ByeSand waves, coral and a rare cruiser.
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
      {/* Back: the bubble SVG, kept bright so it reads through the canvas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(1.2) brightness(0.8)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b2a3a]/35 via-[#0e3346]/40 to-[#06212f]/60" />

      {/* Canvas bubbles (z1). */}
      <WaterCanvas
        active={active && animated}
        bubbleCount={BUBBLE_COUNT[tier]}
        pointer={pointer}
        enableCursor={cursorOn}
      />

      {/* Rare creature cruising right → left, behind the floor/kelp (z2). */}
      {atLeast(tier, "medium") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/underwater/rook.gif"
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-0 z-[2]"
          style={{
            top: "18%",
            width: "clamp(140px, 18vw, 240px)",
            animation: "rook-cruise 55s linear infinite",
          }}
        />
      )}

      {/* Floor stack, back → front: ByeSand waves (z3) → background kelp (z4,
          behind the sand but in front of the waves) → pixel sand (z5) → coral. */}
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] block h-[clamp(90px,12vw,150px)] w-full opacity-95" />
      <Kelp
        animated={animated}
        clusterAround={70}
        scaleMul={1.4}
        className="absolute inset-x-0 bottom-0 z-[4] h-[55%]"
      />
      <SandFloor rows={5} className="absolute inset-x-0 bottom-0 z-[5]" />
      <Coral src="/underwater/coral_red_blue.jpeg" leftPct={13} widthPx={88} />
      <Coral src="/underwater/coral_green.jpeg" leftPct={82} widthPx={74} flip delay={1.4} />

      {/* Foreground kelp — bigger, darker, in front of everything (z6). */}
      <Kelp
        animated={animated}
        seed={5}
        count={7}
        scaleMul={1.9}
        clusterAround={26}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[52%] brightness-[0.55]"
      />

      {cursorOn && <CursorFollower pointer={pointer} />}
    </div>
  );
}
