"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";

const SECTIONS = [
  { id: "me", key: "me" },
  { id: "skills", key: "skills" },
  { id: "projects", key: "projects" },
  { id: "contact", key: "contact" },
] as const;

/**
 * Right-edge scroll timeline (desktop): a tall vertical line that fills with
 * overall page progress — basically a custom scrollbar (the native one is
 * hidden on desktop in globals.css). A single label sits next to it and just
 * swaps its text to the current section as you scroll, instead of four labels
 * jumping between positions. Hidden on touch / small screens.
 */
export default function ScrollTimeline({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  const [active, setActive] = useState<string>("me");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(s.id);
        },
        // Fire when a section crosses the vertical middle of the viewport.
        { rootMargin: "-50% 0px -50% 0px" }
      );
      io.observe(el);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const activeSection = SECTIONS.find((s) => s.id === active);
  const label = (activeSection && labels[activeSection.key]) ?? active;

  return (
    <nav
      aria-label="Sections"
      className="fixed right-4 top-1/2 z-[150] hidden -translate-y-1/2 lg:block xl:right-6"
    >
      <div className="relative flex h-[88vh] items-center justify-end">
        {/* single label, vertically centred, to the left of the line. The
            labels cross-fade in place (no mode="wait" gap) as you scroll. */}
        <div className="absolute right-5 top-1/2 h-4 w-40 -translate-y-1/2">
          <AnimatePresence initial={false}>
            <motion.span
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-1/2 block -translate-y-1/2 whitespace-nowrap text-right font-mono text-[0.62rem] uppercase tracking-[0.24em] text-foreground"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* straight spine + progress fill — the page-process scrollbar */}
        <span
          aria-hidden
          className="absolute bottom-0 right-0 top-0 w-[3px] bg-border"
        />
        <motion.span
          aria-hidden
          style={{ scaleY: fill, transformOrigin: "top" }}
          className="absolute bottom-0 right-0 top-0 w-[3px] bg-foreground"
        />
      </div>
    </nav>
  );
}
