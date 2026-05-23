"use client";

import { useEffect, useRef, useState } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { ByeSand } from "@/components/layout/ByeSand";
import { WaterCanvas } from "./WaterCanvas";
import { Octopus } from "./Octopus";
import { Coral } from "./Coral";
import { Rook } from "./Rook";
import { Crab } from "./Crab";
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

  // Kelp density scales with viewport — lighter on mobile, denser on desktop.
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const bgKelp = vw < 640 ? 8 : vw < 1024 ? 12 : vw < 1600 ? 16 : 20;
  const fgKelp = vw < 640 ? 4 : vw < 1024 ? 6 : 9;

  // Tier budget:
  //  off    – fully static.
  //  low    – SVG bg + CSS sway + ambient creatures (no canvas, no cursor) ← mobile.
  //  medium – + canvas bubbles.
  //  high   – + cursor interaction (octopus avoids/flees/steals, kelp reacts).
  const animated = tier !== "off";
  const creaturesOn = atLeast(tier, "low") && active;
  const canvasOn = atLeast(tier, "medium") && active;
  const interactive = atLeast(tier, "high") && active;
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

      {canvasOn && (
        <WaterCanvas
          active={active}
          bubbleCount={BUBBLE_COUNT[tier]}
          pointer={pointer}
          enableCursor={interactive}
        />
      )}
      {creaturesOn && <Rook />}

      {/* Floor: waves (z2) → bg kelp (z4) → sand (z5) → coral-behind (z5) → crab
          (z6) → coral-front (z7) → octopus (z8) → front kelp (z9). */}
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-[clamp(110px,14vw,185px)] w-full opacity-95" />
      <Kelp
        animated={animated}
        clusterAround={70}
        scaleMul={1.4}
        count={bgKelp}
        pointer={pointer}
        reactive={interactive}
        className="absolute inset-x-0 bottom-0 z-[4] h-[55%]"
      />
      <SandFloor rows={6} className="absolute inset-x-0 bottom-0 z-[5]" />
      <Coral src="/underwater/coral_red_blue.png" leftPct={82} widthPx={132} bottomPx={18} z={5} animated={animated} />
      <Coral src="/underwater/coral_green.png" leftPct={42} widthPx={112} flip delay={1.4} bottomPx={18} z={7} animated={animated} />
      {creaturesOn && <Crab />}

      <Kelp
        animated={animated}
        seed={5}
        count={fgKelp}
        scaleMul={1.9}
        clusterAround={26}
        pointer={pointer}
        reactive={interactive}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-[52%] brightness-[0.55]"
      />

      {creaturesOn && <Octopus pointer={pointer} />}
    </div>
  );
}
