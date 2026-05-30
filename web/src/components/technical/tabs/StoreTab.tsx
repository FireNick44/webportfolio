"use client";

import { PanelHead } from "@/components/technical/panelPrimitives";
import { useAppStore } from "@/lib/store/useAppStore";

// "Store state" tab — raw JSON dump of the Zustand store, with action
// functions stripped (typeof v === "function" is replaced with undefined and
// disappears via JSON.stringify). Useful for debugging persistence + token
// override state without opening DevTools.
export default function StoreTab() {
  return (
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
  );
}
