// Shared primitives for the technical panel: a row-style data table
// (`Section`) and a panel header strip (`PanelHead`). Lifted out of
// TechnicalPanel.tsx so the tab + sub-panel files can compose them without
// pulling the whole panel module.

export type Row = [string, string];

export function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="lab-label text-foreground/80">{title}</span>
      </div>
      <dl className="divide-y divide-border">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between gap-4 px-4 py-2.5"
          >
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="font-mono text-sm">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PanelHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-muted/40 px-4 py-2.5">
      <span className="lab-label text-foreground/80">{children}</span>
    </div>
  );
}

/** True for CSS hex colour strings (3- or 6-digit). Used by the token editor
 *  to decide whether to bind the colour-picker input to the value. */
export const isHex = (v: string) =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
