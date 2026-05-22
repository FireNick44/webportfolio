"use client";

import * as React from "react";
import { flushSync } from "react-dom";

export type Resolved = "light" | "dark";
export type Direction = "btt" | "ttb" | "ltr" | "rtl";

function getClip(direction: Direction): [string, string] {
  switch (direction) {
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
    case "ltr":
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
}

type RenderProps = { resolved: Resolved; toggleTheme: () => void };

export function ThemeToggler({
  resolved,
  setTheme,
  direction = "ltr",
  children,
}: {
  resolved: Resolved;
  setTheme: (theme: Resolved) => void;
  direction?: Direction;
  children: (state: RenderProps) => React.ReactNode;
}) {
  const toggleTheme = React.useCallback(() => {
    const next: Resolved = resolved === "dark" ? "light" : "dark";

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile =
      typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

    if (
      typeof document === "undefined" ||
      !document.startViewTransition ||
      isMobile ||
      reduce
    ) {
      setTheme(next);
      return;
    }

    // Freeze CSS colour transitions during the wipe so every element (wave
    // fills, section backgrounds, buttons) is captured at the NEW theme in the
    // snapshot. Otherwise transitioned elements (e.g. the body's 500ms colour
    // fade) lag on the old colour mid-wipe and desync from the instant ones.
    const root = document.documentElement;
    root.classList.add("vt-no-transition");

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        root.setAttribute("data-theme", next);
        setTheme(next);
      });
    });

    transition.finished.finally(() => {
      root.classList.remove("vt-no-transition");
    });

    transition.ready
      .then(() => {
        const [from, to] = getClip(direction);
        document.documentElement.animate(
          { clipPath: [from, to] },
          {
            duration: 650,
            easing: "cubic-bezier(0.76, 0, 0.24, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
  }, [resolved, setTheme, direction]);

  return (
    <>
      {children({ resolved, toggleTheme })}
      <style>{`::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </>
  );
}
