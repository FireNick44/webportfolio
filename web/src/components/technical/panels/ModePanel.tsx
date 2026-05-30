"use client";

import { RotateCcw } from "lucide-react";

import { ThemeTogglerButton } from "@/components/theme/ThemeTogglerButton";
import { PanelHead } from "@/components/technical/panelPrimitives";
import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

// "Mode" panel: theme toggle, advanced switch (physics wireframes + stats),
// and a button to replay the boot loader. Pure UI — all state in useAppStore.
export default function ModePanel({ dict }: { dict: Dictionary }) {
  const advanced = useAppStore((s) => s.advanced);
  const setAdvanced = useAppStore((s) => s.setAdvanced);
  const setHasShownLoader = useAppStore((s) => s.setHasShownLoader);

  return (
    <div className="border border-border">
      <PanelHead>Mode</PanelHead>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5 p-5">
        <div className="flex items-center gap-3">
          <span className="lab-label">{dict.menu.theme}</span>
          <ThemeTogglerButton variant="outline" />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={advanced}
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-3"
        >
          <span className="lab-label">Advanced</span>
          <span
            className={cn(
              "relative h-6 w-11 rounded-full border border-border transition-colors",
              advanced ? "bg-accent" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all",
                advanced ? "left-[1.45rem]" : "left-0.5",
              )}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setHasShownLoader(false)}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-muted"
        >
          <RotateCcw size={14} />
          Replay loader
        </button>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Advanced mode hides the rack&apos;s top wave and overlays the Matter.js
        physics wireframes + stats on the flask section.
      </p>
    </div>
  );
}
