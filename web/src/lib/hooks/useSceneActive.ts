"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True only when the referenced element is in (or near) the viewport AND the
 * tab is visible — so render loops pause when scrolled away or backgrounded.
 */
export function useSceneActive(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    io.observe(el);

    const onVisibility = () => setVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);

  return inView && visible;
}
