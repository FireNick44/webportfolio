"use client";

import { Check } from "lucide-react";

import { useAppStore } from "@/lib/store/useAppStore";
import { THEME_PRESETS, type ThemePreset } from "@/lib/theme/presets";
import { TOKEN_NAMES } from "@/lib/theme/tokenNames";
import { cn } from "@/lib/utils";

// Theme preset grid. Each preset bundles a scheme (light/dark) + a token map;
// selecting one applies BOTH atomically — the token map is dropped into
// useAppStore.tokenOverrides where AppStateProvider reads it back to set the
// inline CSS variables on <html>. Selecting a preset CLEARS any prior manual
// edits (those would otherwise visibly clobber the new preset's tokens).
export default function ThemePresetsPanel() {
  const setTheme = useAppStore((s) => s.setTheme);
  const preset = useAppStore((s) => s.preset);
  const setPreset = useAppStore((s) => s.setPreset);
  const setTokenOverrides = useAppStore((s) => s.setTokenOverrides);
  const clearTokenOverrides = useAppStore((s) => s.clearTokenOverrides);

  const applyPreset = (p: ThemePreset) => {
    setTheme(p.scheme);
    setPreset(p.id);
    if (p.tokens) {
      const map: Record<string, string> = {};
      for (const n of TOKEN_NAMES) {
        const v = p.tokens[n];
        if (v) map[n] = v;
      }
      setTokenOverrides(map);
    } else {
      clearTokenOverrides();
    }
  };

  return (
    <div className="border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="lab-label text-foreground/80">Theme presets</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {THEME_PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "group flex items-center gap-3 bg-background p-4 text-left transition-colors hover:bg-muted",
                active && "bg-muted",
              )}
            >
              <span className="flex shrink-0">
                {p.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-7 w-4 border border-border first:rounded-l-sm last:rounded-r-sm"
                    style={{ background: c, marginLeft: i ? -1 : 0 }}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {p.name}
                </span>
                <span className="lab-label">{p.scheme}</span>
              </span>
              {active && (
                <Check size={16} className="shrink-0 text-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
