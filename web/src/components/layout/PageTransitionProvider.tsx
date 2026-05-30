"use client";

import { motion, useAnimationControls } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const EASE = [0.76, 0, 0.24, 1] as const;
const SLIDE_IN = 0.4;
const SLIDE_OUT = 0.45;

interface TransitionCtx {
  navigateTo: (href: string) => void;
  isTransitioning: boolean;
}

const Ctx = createContext<TransitionCtx | null>(null);

export function usePageTransition() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("usePageTransition must be used inside PageTransitionProvider");
  return ctx;
}

export function PageTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const controls = useAnimationControls();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPath = useRef(pathname);
  const phase = useRef<"idle" | "covering" | "revealing">("idle");

  const navigateTo = useCallback(
    async (href: string) => {
      if (phase.current !== "idle") return;
      const hrefPath = href.split("?")[0].split("#")[0];
      if (hrefPath === pathname) return;

      phase.current = "covering";
      setIsTransitioning(true);

      await controls.start({
        y: "0%",
        transition: { duration: SLIDE_IN, ease: EASE },
      });
      controls.set({ pointerEvents: "auto" });
      router.push(href);
    },
    [controls, router, pathname],
  );

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (phase.current === "covering") {
        phase.current = "revealing";
        setTimeout(() => {
          controls
            .start({ y: "100%", transition: { duration: SLIDE_OUT, ease: EASE } })
            .then(() => {
              controls.set({ y: "-100%", pointerEvents: "none" });
              phase.current = "idle";
              setIsTransitioning(false);
            });
        }, 80);
      }
    }
  }, [pathname, controls]);

  return (
    <Ctx.Provider value={{ navigateTo, isTransitioning }}>
      {children}
      <motion.div
        animate={controls}
        initial={{ y: "-100%" }}
        aria-hidden
        style={{
          position: "fixed",
          inset: "-10vh -10vw",
          zIndex: 999,
          backgroundColor: "var(--foreground)",
          pointerEvents: "none",
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      />
    </Ctx.Provider>
  );
}
