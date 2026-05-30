"use client";

import { PanelHead } from "@/components/technical/panelPrimitives";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

// Underwater outro graphics tier control. The tier is shared with the flask
// rack (see useAppStore.graphicsTier) — `off` makes the rack fully static,
// `high` runs full physics + bubbles + sprites.
export default function OutroPanel() {
  const graphicsTier = useAppStore((s) => s.graphicsTier);
  const setGraphicsTier = useAppStore((s) => s.setGraphicsTier);

  return (
    <div className="border border-border">
      <PanelHead>Underwater outro</PanelHead>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="lab-label w-20">Graphics</span>
          <div className="flex gap-px bg-border">
            {(["off", "low", "medium", "high"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setGraphicsTier(t)}
                className={cn(
                  "bg-background px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                  graphicsTier === t
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Switch the page&apos;s ending between the current outro and the
        interactive underwater scene. Graphics scales the effect — Off respects
        reduced motion; touch devices cap at Low.
      </p>
    </div>
  );
}
