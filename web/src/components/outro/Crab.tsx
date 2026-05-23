"use client";

import { useEffect, useRef } from "react";

type Member = { size: number; dx: number; bob: number };

const SOLO: Member[] = [{ size: 140, dx: 0, bob: 0 }];
const FAMILY: Member[] = [
  { size: 140, dx: 0, bob: 0 },
  { size: 96, dx: -120, bob: 0.2 },
  { size: 82, dx: -212, bob: 0.4 },
];

type WalkerProps = {
  members: Member[];
  groupWidth: number;
  durMin: number;
  durRand: number;
  /** continuous: loops across with no gap; otherwise it strolls, waits, repeats. */
  continuous?: boolean;
  gapMin?: number;
  gapRand?: number;
  startDelay?: number;
};

/** One crab "event" — a group that walks left → right along the sand. */
function CrabWalker({
  members,
  groupWidth,
  durMin,
  durRand,
  continuous = false,
  gapMin = 0,
  gapRand = 0,
  startDelay = 0,
}: WalkerProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const st = useRef({ startAt: 0, dur: 0, init: false });
  const offLeft = -(groupWidth + 60);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const scene = group.parentElement;

    const frame = (now: number) => {
      const s = st.current;
      if (!s.init) {
        s.init = true;
        s.startAt = now + startDelay;
        s.dur = durMin + Math.random() * durRand;
      }
      const W = scene?.getBoundingClientRect().width || 1000;
      const endX = W + groupWidth;
      const elapsed = now - s.startAt;
      let x = offLeft;

      if (continuous) {
        const p = elapsed <= 0 ? 0 : (elapsed / s.dur) % 1; // wraps off-screen
        x = offLeft + (endX - offLeft) * p;
      } else if (elapsed >= 0) {
        const p = elapsed / s.dur;
        if (p >= 1) {
          // Finished a pass — wait off-screen, then schedule the next stroll.
          s.startAt = now + gapMin + Math.random() * gapRand;
          s.dur = durMin + Math.random() * durRand;
        } else {
          x = offLeft + (endX - offLeft) * p;
        }
      }

      group.style.transform = `translateX(${x}px)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [continuous, durMin, durRand, gapMin, gapRand, offLeft, startDelay]);

  return (
    <div
      ref={groupRef}
      aria-hidden
      className="pointer-events-none absolute bottom-[10px] left-0 z-[6]"
      style={{ transform: `translateX(${offLeft}px)`, willChange: "transform" }}
    >
      {members.map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/underwater/crab.gif"
          alt=""
          draggable={false}
          className="absolute bottom-0"
          style={{
            left: m.dx,
            width: m.size,
            height: "auto",
            imageRendering: "pixelated",
            animation: `crab-bob 0.55s ease-in-out ${m.bob}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Two independent crab events strolling the sand:
 *  - a solo crab, always around (continuous loop);
 *  - a separate crab family (big + two trailing), passing by periodically.
 */
export function Crab() {
  return (
    <>
      <CrabWalker members={SOLO} groupWidth={140} durMin={16000} durRand={6000} continuous />
      <CrabWalker
        members={FAMILY}
        groupWidth={260}
        durMin={17000}
        durRand={6000}
        gapMin={14000}
        gapRand={12000}
        startDelay={4000}
      />
    </>
  );
}
