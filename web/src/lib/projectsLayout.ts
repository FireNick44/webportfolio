export interface SizeSpan {
  col: number;
  row: number;
}

export interface ProjectsLayout {
  columns: { base: number; sm: number; lg: number };
  rowHeight: string;
  gap: string;
  sizes: Record<string, SizeSpan>;
}

// Resolve a card's size token to its grid span. Unknown or missing tokens
// fall back to the layout's "default" span, then to a 1x1 cell.
export function resolveSpan(layout: ProjectsLayout, size?: string): SizeSpan {
  if (size && layout.sizes[size]) return layout.sizes[size];
  return layout.sizes.default ?? { col: 1, row: 1 };
}
