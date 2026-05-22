"use client";

import { useEffect, useRef, type RefObject } from "react";
import { generateBubbles, type Bubble } from "@/lib/outro/bubbles";
import { repel, advanceRipple, type Ripple } from "@/lib/outro/cursorPhysics";
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
  const ripplesRef = useRef<Ripple[]>([]);
  const trailAccum = useRef(0);

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

      const p = enableCursor ? pointer?.current : null;
      const cursorOn = !!p && p.active;

      if (cursorOn) {
        const speed = Math.hypot(p.vx, p.vy);
        trailAccum.current += dt;
        if (trailAccum.current > 0.04 && speed > 1.5) {
          trailAccum.current = 0;
          bubblesRef.current.push({
            id: -1,
            baseX: p.x / w,
            y: p.y,
            r: 1.5 + Math.random() * 2,
            speed: 30 + Math.random() * 30,
            wobbleAmp: 4,
            wobbleFreq: 2,
            wobblePhase: Math.random() * Math.PI * 2,
          });
          if (bubblesRef.current.length > bubbleCount + 40) bubblesRef.current.shift();
        }
        if (speed > 6 && ripplesRef.current.length < 14) {
          ripplesRef.current.push({ x: p.x, y: p.y, r: 4, alpha: 0.32 });
        }
      }

      for (const b of bubblesRef.current) {
        b.y -= b.speed * dt;
        if (b.y < -b.r) {
          b.y = h + b.r;
          b.baseX = Math.random();
        }
        let x = b.baseX * w + Math.sin((now / 1000) * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp;
        if (cursorOn) {
          const { dx, dy } = repel(x, b.y, p.x, p.y, 90, 14);
          x += dx;
          b.y += dy;
        }
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 235, ${0.08 + Math.min(b.r, 6) * 0.03})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(210, 240, 250, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (ripplesRef.current.length) {
        for (const r of ripplesRef.current) {
          const n = advanceRipple(r, dt, 70, 0.7);
          r.r = n.r;
          r.alpha = n.alpha;
          if (r.alpha > 0) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 235, 245, ${r.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0);
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
