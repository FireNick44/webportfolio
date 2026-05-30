"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";

const SECTIONS = [
  { id: "me", key: "me" },
  { id: "skills", key: "skills" },
  { id: "projects", key: "projects" },
  { id: "contact", key: "contact" },
] as const;

/**
 * Right-edge scroll timeline (desktop only): a tall vertical line that fills
 * with overall page progress — basically a custom scrollbar (the native one is
 * hidden on desktop in globals.css). A single label sits at the top next to it
 * and just swaps its text to the current section as you scroll, instead of four
 * labels jumping between positions. Hidden below `lg`: on mobile the native
 * scrollbar can't be removed, so showing this too would be a redundant second
 * scroll indicator.
 */
// Routes that don't have the four portfolio sections (me/skills/projects/
// contact). The timeline would never light up, so hide it entirely instead of
// showing a dead right-edge bar.
const HIDE_ON = /^\/[a-z]{2}\/(datenschutz|impressum|technical)(\/|$)/;

export default function ScrollTimeline({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const pathname = usePathname();
  const hidden = pathname ? HIDE_ON.test(pathname) : false;
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

  if (hidden) return null;

  return (
    <nav
      aria-label="Sections"
      className="fixed right-4 top-1/2 z-[150] hidden -translate-y-1/2 lg:block xl:right-6"
    >
      <div className="relative flex h-[88vh] w-8 items-center justify-end lg:w-auto">
        {/* single label, at the top, to the left of the line. The labels
            cross-fade in place (no mode="wait" gap) as you scroll. */}
        <div className="pointer-events-none absolute right-5 top-0 h-4 w-40">
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
