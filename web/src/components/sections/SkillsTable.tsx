import skillsTable from "@/data/skills-table.json";

// Skills table ported from Noel's original portfolio — categories, each split
// into "//comment"-labelled groups of items. Fully driven by
// `src/data/skills-table.json`, so it's edited there, not in code.

interface SkillGroup {
  label?: string;
  items: string[];
}
interface SkillCategory {
  title: string;
  groups: SkillGroup[];
}

export function SkillsTable() {
  const categories = skillsTable.categories as SkillCategory[];

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <div key={cat.title}>
          <h3 className="border-b border-border pb-2.5 font-display text-lg font-bold tracking-tight">
            {cat.title}
          </h3>
          <div className="mt-5 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {cat.groups.map((g, i) => (
              <div key={i}>
                {g.label && (
                  <span className="mb-2 block font-mono text-xs text-muted-foreground/70">
                    {g.label}
                  </span>
                )}
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
