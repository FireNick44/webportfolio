"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { usePageTransition } from "@/components/layout/PageTransitionProvider";
import AppearanceTab from "@/components/technical/tabs/AppearanceTab";
import DiagnosticsTab from "@/components/technical/tabs/DiagnosticsTab";
import StoreTab from "@/components/technical/tabs/StoreTab";
import VersionsTab from "@/components/technical/tabs/VersionsTab";
import type { Dictionary } from "@/i18n/types";
import { useDeviceInfo } from "@/lib/hooks/useDeviceInfo";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

// Technical panel root: a /-/technical leaf route used as the lab's debug
// surface. Four tabs (appearance · versions · diagnostics · store) are split
// into per-tab components; this file handles the page chrome (back-link, tab
// nav, hydration gate) and dispatches to the tab body.
//
// Mounted gate: useDeviceInfo() reads navigator + matchMedia, both of which
// only exist on the client. We render a placeholder during SSR + the first
// client render, then swap to the real content once `mounted` flips true.

const TABS = ["appearance", "versions", "diagnostics", "store"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  appearance: "Appearance",
  versions: "Versions",
  diagnostics: "Diagnostics",
  store: "Store state",
};

export default function TechnicalPanel({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const { navigateTo } = usePageTransition();
  const language = useAppStore((s) => s.language);
  void language; // subscribed so the store snapshot recomputes on locale flip

  const [tab, setTab] = useState<Tab>("appearance");
  const { mounted, device, display, media, hardware } = useDeviceInfo();

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
        <AppearanceTab dict={dict} />
      ) : tab === "diagnostics" ? (
        <DiagnosticsTab
          device={device!}
          display={display}
          media={media}
          hardware={hardware}
        />
      ) : tab === "versions" ? (
        <VersionsTab />
      ) : (
        <StoreTab />
      )}
    </div>
  );
}
