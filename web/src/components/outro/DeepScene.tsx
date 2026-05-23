"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { WaterCanvas } from "./WaterCanvas";
import { Octopus } from "./Octopus";
import { Kelp } from "./Kelp";
import { SandFloor } from "./SandFloor";
import { PixelSignoff } from "./PixelSignoff";

const BUBBLE_COUNT: Record<GraphicsTier, number> = {
  off: 0,
  low: 24,
  medium: 40,
  high: 70,
};

export function DeepScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = useGraphicsTier();
  const active = useSceneActive(containerRef);
  const animated = tier !== "off";
  const cursorOn = atLeast(tier, "medium") && active;
  const pointer = usePointerField(containerRef, cursorOn);

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* Deepest layer: the existing bubble SVG, recolored to deep water. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "hue-rotate(190deg) saturate(1.4) brightness(0.5)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04121f]/70 via-[#062436]/80 to-[#01243a]/90" />

      <WaterCanvas
        active={active && animated}
        bubbleCount={BUBBLE_COUNT[tier]}
        pointer={pointer}
        enableCursor={cursorOn}
      />
      <Kelp animated={animated} />
      <SandFloor />
      {cursorOn && <Octopus pointer={pointer} />}
      {tier === "high" && <PixelSignoff />}
    </div>
  );
}
