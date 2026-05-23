"use client";

import { useEffect, useRef, type RefObject } from "react";
import { generateBubbles, type Bubble } from "@/lib/outro/bubbles";
import { repel } from "@/lib/outro/cursorPhysics";
import type { PointerField } from "@/hooks/usePointerField";

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
      bubblesRef.current = generateBubbles(seed, bubbleCount, { width: w, height: h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // The cursor only ever PUSHES existing bubbles — it never spawns new ones,
      // so the bubble count is constant and nothing accumulates / disappears.
      const p = enableCursor ? pointer?.current : null;
      const cursorOn = !!p && p.active;

      for (const b of bubblesRef.current) {
        b.y -= b.speed * dt;
        if (b.y < -b.r) {
          b.y = h + b.r;
          b.baseX = Math.random();
        }
        let x = b.baseX * w + Math.sin((now / 1000) * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp;
        let y = b.y;
        if (cursorOn) {
          const { dx, dy } = repel(x, y, p.x, p.y, 120, 26);
          x += dx;
          y += dy;
        }
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
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
