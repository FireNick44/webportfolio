"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { PointerField } from "@/hooks/usePointerField";
import { generateBubbles } from "@/lib/outro/bubbles";
import { repel } from "@/lib/outro/cursorPhysics";

// A live bubble: persistent position + a push velocity the cursor adds to.
interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobbleAmp: number;
  wobbleFreq: number;
  wobblePhase: number;
  vx: number;
  vy: number;
}

const FLEE_R = 130;
const FLEE_FORCE = 2200; // px/s^2 at the cursor
const DAMP = 3; // velocity decay per second

export function WaterCanvas({
  active,
  bubbleCount,
  seed = 7,
  pointer,
  enableCursor = false,
}: {
  active: boolean;
  bubbleCount: number;
  seed?: number;
  pointer?: RefObject<PointerField | null>;
  enableCursor?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || bubbleCount === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bubblesRef.current = generateBubbles(seed, bubbleCount, { width: w, height: h }).map((b) => ({
        x: b.baseX * w,
        y: b.y,
        r: b.r,
        speed: b.speed,
        wobbleAmp: b.wobbleAmp,
        wobbleFreq: b.wobbleFreq,
        wobblePhase: b.wobblePhase,
        vx: 0,
        vy: 0,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      const p = enableCursor ? pointer?.current : null;
      const cursorOn = !!p && p.active;
      const damp = Math.exp(-DAMP * dt);
      const t = now / 1000;

      for (const b of bubblesRef.current) {
        // The cursor shoves the bubble for REAL (adds to its velocity), so it
        // moves away and keeps drifting — no snap-back, no redraw glitch.
        if (cursorOn) {
          const { dx, dy } = repel(b.x, b.y, p.x, p.y, FLEE_R, FLEE_FORCE);
          b.vx += dx * dt;
          b.vy += dy * dt;
        }
        b.vx *= damp;
        b.vy *= damp;
        // Persistent push + buoyant rise with a gentle speed pulse (less uniform).
        b.x += b.vx * dt;
        b.y += b.vy * dt - b.speed * (0.8 + 0.35 * Math.sin(t * 0.6 + b.wobblePhase)) * dt;

        // Respawn at the bottom; wrap horizontally if shoved off a side.
        if (b.y < -b.r) {
          b.y = h + b.r;
          b.x = Math.random() * w;
          b.vx = 0;
          b.vy = 0;
        }
        if (b.x < -b.r) b.x = w + b.r;
        else if (b.x > w + b.r) b.x = -b.r;

        // Two layered wobbles → a meandering, custom-feeling rising path.
        const drawX =
          b.x +
          Math.sin(t * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp +
          Math.sin(t * b.wobbleFreq * 0.47 + b.wobblePhase * 1.7) * b.wobbleAmp * 0.55;
        ctx.beginPath();
        ctx.arc(drawX, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 235, ${0.08 + Math.min(b.r, 6) * 0.03})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(210, 240, 250, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active, bubbleCount, seed, pointer, enableCursor]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}
