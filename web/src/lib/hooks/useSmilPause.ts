"use client";

import { useEffect, type RefObject } from "react";

/**
 * Pause every SMIL animation (`<animate>`, `<animateTransform>`) inside `ref`
 * while the element is off-screen or the tab is hidden.
 *
 * SMIL keeps ticking on the main thread no matter where the SVG is: an inline
 * SVG that has been scrolled away still pays style/paint invalidation for every
 * animated node on every frame. The hero bubbles (31 animated circles) and the
 * wave dividers (5 path morphs) add up to a constant background cost while the
 * visitor scrolls the rest of the page. `rootMargin` keeps a buffer so the
 * animation is already running by the time the element scrolls into view.
 */
export function useSmilPause(
  ref: RefObject<HTMLElement | SVGSVGElement | null>,
  rootMargin = "150px",
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svgs: SVGSVGElement[] =
      root instanceof SVGSVGElement
        ? [root]
        : Array.from(root.querySelectorAll("svg"));
    if (svgs.length === 0) return;

    let inView = true;
    const apply = () => {
      const run = inView && document.visibilityState === "visible";
      for (const svg of svgs) {
        if (run) svg.unpauseAnimations();
        else svg.pauseAnimations();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        apply();
      },
      { rootMargin },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
      for (const svg of svgs) svg.unpauseAnimations();
    };
  }, [ref, rootMargin]);
}
