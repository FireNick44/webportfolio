import skillsTableEn from "@/data/skills-table.json";
import skillsTableDe from "@/data/skills-table.de.json";

// Skills table ported from the 2024 portfolio — categories, each split into
// "//comment"-labelled groups of items. Data lives in `skills-table.json` (en)
// and `skills-table.de.json` (de); category titles are translated, the "//"
// code-comment labels stay English on purpose (dev humour).
//
// Items inside a group are written as full text lines (e.g. "Visual Studio,
// VS Code" as one item, not two) so the author controls exactly which entries
// share a line — matches the old portfolio's compact "two-on-a-line" rhythm.
// The first category (Coding & Frameworks) gets a louder heading + full-tone
// rule so it reads as the focus; the rest sit beneath it as compact context.

interface SkillGroup {
  label?: string;
  items: string[];
}
interface SkillCategory {
  title: string;
  groups: SkillGroup[];
}

export function SkillsTable({ lang }: { lang?: string }) {
  const table = lang === "de" ? skillsTableDe : skillsTableEn;
  const categories = table.categories as SkillCategory[];

  return (
    <div className="space-y-8">
      {categories.map((cat, idx) => {
        const isFocus = idx === 0;
        return (
          <div key={cat.title}>
            <h3
              className={
                isFocus
                  ? "border-b border-foreground pb-2.5 font-display text-xl font-bold tracking-tight"
                  : "border-b border-border pb-2 font-display text-base font-bold tracking-tight"
              }
            >
              {cat.title}
            </h3>
            <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.groups.map((g, i) => (
                <div key={i}>
                  {g.label && (
                    <span className="mb-1.5 block font-mono text-xs text-muted-foreground/70">
                      {g.label}
                    </span>
                  )}
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {g.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
