"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { isHex } from "@/components/technical/panelPrimitives";
import { useAppStore } from "@/lib/store/useAppStore";
import { TOKEN_NAMES, type TokenName } from "@/lib/theme/tokenNames";
import { cn } from "@/lib/utils";

// Live design-token editor. Each row shows the EFFECTIVE value (override or
// computed default), backed by both a colour-picker and a free-text input so
// non-hex values (rgba, hsl, var(--…)) can still be edited. Editing any token
// drops the preset (manual edits diverge from any named preset).
//
// The "effective" computed map is read back from <html>'s getComputedStyle
// once per change, but deferred to a rAF — AppStateProvider (an ancestor)
// reconciles the inline overrides in an effect that runs the SAME tick we get
// notified of the store change, so the read without rAF is one render stale.
export default function TokenEditorPanel() {
  const theme = useAppStore((s) => s.theme);
  const preset = useAppStore((s) => s.preset);
  const tokenOverrides = useAppStore((s) => s.tokenOverrides);
  const setTokenOverride = useAppStore((s) => s.setTokenOverride);
  const setPreset = useAppStore((s) => s.setPreset);
  const clearTokenOverrides = useAppStore((s) => s.clearTokenOverrides);

  const [computed, setComputed] = useState<Record<string, string>>({});

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const n of TOKEN_NAMES) next[n] = cs.getPropertyValue(n).trim();
      setComputed(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [theme, preset, tokenOverrides]);

  const editToken = (name: TokenName, value: string) => {
    setTokenOverride(name, value);
    setPreset(null);
  };

  const resetTokens = () => {
    clearTokenOverrides();
    setPreset(null);
  };

  const valueOf = (name: TokenName) =>
    tokenOverrides[name] ?? computed[name] ?? "";

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="lab-label text-foreground/80">
          Design tokens (live)
        </span>
        <button
          type="button"
          onClick={resetTokens}
          className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>
      <div className="divide-y divide-border">
        {TOKEN_NAMES.map((name) => {
          const val = valueOf(name);
          const hex = isHex(val);
          const overridden = name in tokenOverrides;
          return (
            <div key={name} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-7 w-7 shrink-0 rounded-sm border border-border"
                style={{ background: val }}
              />
              <code
                className={cn(
                  "w-44 shrink-0 font-mono text-xs",
                  overridden ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {name}
              </code>
              <input
                type="color"
                aria-label={`${name} colour`}
                value={hex ? val : "#000000"}
                onChange={(e) => editToken(name, e.target.value)}
                className="h-7 w-9 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent"
              />
              <input
                type="text"
                aria-label={`${name} value`}
                value={val}
                spellCheck={false}
                onChange={(e) => editToken(name, e.target.value)}
                className="min-w-0 flex-1 rounded-sm border border-border bg-card px-2 py-1 font-mono text-xs outline-none focus:border-ring"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
