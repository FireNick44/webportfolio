"use client";

import { PanelHead } from "@/components/technical/panelPrimitives";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

// Live tuning for the flask rack:
//   - Water alpha (0..1, palette default 0.7) — applied immediately to every
//     flask via the liquidOpacity prop; no relayout.
//   - Shapes "off|random" — toggles between fixed rect bottles and the rect /
//     round / cone mix. Applies on the next layout reseed (currently a reload).
//   - Chain bump "off|on" — keeps the held flask colliding with other chains
//     during a drag. Off (default) lets it pass through; on is the playground
//     mode where wedges become a feature you can experiment with.
export default function FlaskRackPanel() {
  const liquidOpacity = useAppStore((s) => s.liquidOpacity);
  const setLiquidOpacity = useAppStore((s) => s.setLiquidOpacity);
  const randomizeFlaskShapes = useAppStore((s) => s.randomizeFlaskShapes);
  const setRandomizeFlaskShapes = useAppStore(
    (s) => s.setRandomizeFlaskShapes,
  );
  const dragKeepsChainCollision = useAppStore(
    (s) => s.dragKeepsChainCollision,
  );
  const setDragKeepsChainCollision = useAppStore(
    (s) => s.setDragKeepsChainCollision,
  );

  return (
    <div className="border border-border">
      <PanelHead>Flask rack</PanelHead>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="lab-label w-24">Water alpha</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={liquidOpacity}
            onChange={(e) => setLiquidOpacity(parseFloat(e.target.value))}
            className="flex-1 accent-foreground"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums">
            {liquidOpacity.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="lab-label w-24">Shapes</span>
          <div className="flex gap-px bg-border">
            {(
              [
                ["off", false],
                ["random", true],
              ] as const
            ).map(([label, on]) => (
              <button
                key={label}
                type="button"
                onClick={() => setRandomizeFlaskShapes(on)}
                className={cn(
                  "bg-background px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                  randomizeFlaskShapes === on
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="lab-label w-24">Chain bump</span>
          <div className="flex gap-px bg-border">
            {(
              [
                ["off", false],
                ["on", true],
              ] as const
            ).map(([label, on]) => (
              <button
                key={label}
                type="button"
                onClick={() => setDragKeepsChainCollision(on)}
                className={cn(
                  "bg-background px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                  dragKeepsChainCollision === on
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Live water alpha (0–1, palette default 0.7) and bottle-shape
        randomisation (rect / round / cone). Shape changes apply on the next
        layout reseed — currently a full reload. Chain bump ON keeps the held
        flask colliding with other chains while you drag — fun to play with,
        easy to wedge.
      </p>
    </div>
  );
}
