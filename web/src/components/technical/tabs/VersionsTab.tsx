"use client";

import { Check } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  PanelHead,
  Section,
} from "@/components/technical/panelPrimitives";
import { buildInfo } from "@/lib/buildInfo";
import { versions, currentVersionId } from "@/lib/versions";

// "Versions" tab — the cross-version index (links to each archived portfolio
// build, marking the current and the latest) followed by build metadata
// (commit SHA, build timestamp, stack versions) from buildInfo, which the
// build step bakes in via lib/buildInfo.ts.
export default function VersionsTab() {
  const pathname = usePathname();
  const activeVersion = currentVersionId(pathname ?? "/");

  return (
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
  );
}
