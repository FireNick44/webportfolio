"use client";

import { ArrowLeft, RotateCcw, Check } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { usePageTransition } from "@/components/layout/PageTransitionProvider";
import { ThemeTogglerButton } from "@/components/theme/ThemeTogglerButton";
import type { Dictionary } from "@/i18n/types";
import { buildInfo } from "@/lib/buildInfo";
import {
  THEME_PRESETS,
  TOKEN_NAMES,
  type ThemePreset,
  type TokenName,
} from "@/lib/themePresets";
import { cn } from "@/lib/utils";
import { versions, currentVersionId } from "@/lib/versions";
import { useAppStore } from "@/lib/store/useAppStore";

type Row = [string, string];

function mediaList(): Row[] {
  const q = (s: string) =>
    typeof window !== "undefined" && window.matchMedia(s).matches ? "yes" : "no";
  return [
    ["prefers-color-scheme: dark", q("(prefers-color-scheme: dark)")],
    ["prefers-reduced-motion", q("(prefers-reduced-motion: reduce)")],
    ["prefers-contrast: more", q("(prefers-contrast: more)")],
    ["any-hover: hover", q("(any-hover: hover)")],
    ["any-pointer: fine", q("(any-pointer: fine)")],
  ];
}

function detect() {
  const ua = navigator.userAgent;
  const os =
    /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Brave/.test(ua) ? "Brave"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Unknown";
  const engine =
    /Gecko\/|Firefox/.test(ua) && !/like Gecko/.test(ua) ? "Gecko"
    : /AppleWebKit/.test(ua) && !/Chrome/.test(ua) ? "WebKit"
    : /AppleWebKit/.test(ua) ? "Blink"
    : "Unknown";
  const touch = navigator.maxTouchPoints > 0;
  const form = touch && window.innerWidth < 768 ? "Mobile"
    : touch && window.innerWidth < 1100 ? "Tablet"
    : "Desktop";
  return { os, browser, engine, form, touch };
}

const TABS = ["appearance", "versions", "diagnostics", "store"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  appearance: "Appearance",
  versions: "Versions",
  diagnostics: "Diagnostics",
  store: "Store state",
};

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="lab-label text-foreground/80">{title}</span>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="font-mono text-sm">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PanelHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-muted/40 px-4 py-2.5">
      <span className="lab-label text-foreground/80">{children}</span>
    </div>
  );
}

export default function TechnicalPanel({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const { navigateTo } = usePageTransition();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const language = useAppStore((s) => s.language);
  const preset = useAppStore((s) => s.preset);
  const setPreset = useAppStore((s) => s.setPreset);
  const tokenOverrides = useAppStore((s) => s.tokenOverrides);
  const setTokenOverride = useAppStore((s) => s.setTokenOverride);
  const setTokenOverrides = useAppStore((s) => s.setTokenOverrides);
  const clearTokenOverrides = useAppStore((s) => s.clearTokenOverrides);
  const advanced = useAppStore((s) => s.advanced);
  const setAdvanced = useAppStore((s) => s.setAdvanced);
  const setHasShownLoader = useAppStore((s) => s.setHasShownLoader);
  const graphicsTier = useAppStore((s) => s.graphicsTier);
  const setGraphicsTier = useAppStore((s) => s.setGraphicsTier);
  const liquidOpacity = useAppStore((s) => s.liquidOpacity);
  const setLiquidOpacity = useAppStore((s) => s.setLiquidOpacity);
  const randomizeFlaskShapes = useAppStore((s) => s.randomizeFlaskShapes);
  const setRandomizeFlaskShapes = useAppStore(
    (s) => s.setRandomizeFlaskShapes,
  );
  const dragKeepsChainCollision = useAppStore((s) => s.dragKeepsChainCollision);
  const setDragKeepsChainCollision = useAppStore(
    (s) => s.setDragKeepsChainCollision,
  );

  const pathname = usePathname();
  const activeVersion = currentVersionId(pathname ?? "/");

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("appearance");
  const [device, setDevice] = useState<ReturnType<typeof detect> | null>(null);
  const [display, setDisplay] = useState<Row[]>([]);
  const [media, setMedia] = useState<Row[]>([]);
  const [hardware, setHardware] = useState<Row[]>([]);
  // Effective computed token values, refreshed whenever the theme changes.
  const [computed, setComputed] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    setDevice(detect());
    setMedia(mediaList());
    setDisplay([
      ["Viewport", `${window.innerWidth} × ${window.innerHeight}`],
      ["Screen", `${window.screen.width} × ${window.screen.height}`],
      ["Device pixel ratio", String(window.devicePixelRatio)],
      ["Colour depth", `${window.screen.colorDepth}-bit`],
      [
        "Orientation",
        window.matchMedia("(orientation: portrait)").matches
          ? "portrait"
          : "landscape",
      ],
      [
        "View Transitions",
        typeof document !== "undefined" && "startViewTransition" in document
          ? "supported"
          : "no",
      ],
    ]);
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    setHardware([
      ["CPU cores", String(nav.hardwareConcurrency ?? "—")],
      ["Device memory", nav.deviceMemory ? `${nav.deviceMemory} GB` : "—"],
      ["Touch points", String(navigator.maxTouchPoints)],
      ["Online", navigator.onLine ? "yes" : "no"],
      ["Browser language", navigator.language],
    ]);
  }, []);

  // Read back the *effective* token values (defaults + active overrides).
  // Deferred to a rAF so it runs AFTER AppStateProvider (an ancestor) has
  // reconciled the inline overrides — otherwise the read is one render stale
  // right after switching presets.
  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const n of TOKEN_NAMES) next[n] = cs.getPropertyValue(n).trim();
      setComputed(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [mounted, theme, preset, tokenOverrides]);

  void language; // subscribed so the store snapshot recomputes on change

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

  const editToken = (name: TokenName, value: string) => {
    setTokenOverride(name, value);
    setPreset(null); // manual edits diverge from any named preset
  };

  const resetTokens = () => {
    clearTokenOverrides();
    setPreset(null);
  };

  const valueOf = (name: TokenName) =>
    tokenOverrides[name] ?? computed[name] ?? "";

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
      {/* Framed back-link, same style as the legal pages so the "subpage"
          breadcrumb reads identically across all leaf routes. */}
      <button
        type="button"
        onClick={() => navigateTo(`/${lang}`)}
        className="group mb-10 inline-flex h-9 items-center gap-2 border border-border px-3 font-mono text-xs uppercase tracking-[0.22em] text-foreground/75 transition-colors hover:border-foreground/70 hover:text-foreground"
      >
        <ArrowLeft
          size={14}
          className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:-translate-x-0.5"
        />
        {lang === "en" ? "Home" : "Startseite"}
      </button>

      <span className="lab-label">— / {dict.nav.technical}</span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {dict.nav.technical}
      </h1>

      {/* Tab nav */}
      <div className="mt-10 flex gap-0 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative -mb-px border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {!mounted ? (
        <p className="lab-label mt-10">reading instruments…</p>
      ) : tab === "appearance" ? (
        <div className="mt-8 space-y-8">
          {/* Mode controls */}
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
              Advanced mode hides the rack&apos;s top wave and overlays the
              Matter.js physics wireframes + stats on the flask section.
            </p>
          </div>

          {/* Underwater outro */}
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
              interactive underwater scene. Graphics scales the effect — Off
              respects reduced motion; touch devices cap at Low.
            </p>
          </div>

          {/* Flask rack — live tuning */}
          <div className="border border-border">
            <PanelHead>Flask rack</PanelHead>
            <div className="space-y-5 p-5">
              {/* Water opacity */}
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

              {/* Randomize shapes */}
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

              {/* Drag-through-chain (advanced playground knob) */}
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
              randomisation (rect / round / cone). Shape changes apply on the
              next layout reseed — currently a full reload. Chain bump ON keeps
              the held flask colliding with other chains while you drag — fun to
              play with, easy to wedge.
            </p>
          </div>

          {/* Theme presets */}
          <div className="border border-border">
            <PanelHead>Theme presets</PanelHead>
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
                    {active && <Check size={16} className="shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live token editor */}
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
                  <div
                    key={name}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
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
        </div>
      ) : tab === "diagnostics" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Section
            title="Device"
            rows={[
              ["Form factor", device!.form],
              ["Operating system", device!.os],
              ["Browser", device!.browser],
              ["Engine", device!.engine],
            ]}
          />
          <Section title="Display" rows={display} />
          <Section title="Preferences" rows={media} />
          <Section title="Hardware" rows={hardware} />
        </div>
      ) : tab === "versions" ? (
        <div className="mt-8 space-y-4">
          <div className="border border-border">
            <PanelHead>Versions</PanelHead>
            <ul className="divide-y divide-border">
              {versions.map((v) => {
                const active = v.id === activeVersion;
                return (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{v.label}</span>
                      {v.isLatest && (
                        <span className="lab-label text-accent">latest</span>
                      )}
                      {active && <Check size={14} className="text-accent" />}
                    </span>
                    <a
                      href={v.path}
                      className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {v.path}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <Section
            title="Build"
            rows={[
              ["Version", buildInfo.version],
              ["Commit", buildInfo.gitSha],
              ["Built", buildInfo.buildDate.slice(0, 19).replace("T", " ")],
              ["Next.js", buildInfo.stack.next],
              ["React", buildInfo.stack.react],
              ["Tailwind", buildInfo.stack.tailwind],
            ]}
          />
        </div>
      ) : (
        <div className="mt-8 border border-border">
          <PanelHead>Store state</PanelHead>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-muted-foreground">
            {JSON.stringify(
              useAppStore.getState(),
              (k, v) => (typeof v === "function" ? undefined : v),
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
