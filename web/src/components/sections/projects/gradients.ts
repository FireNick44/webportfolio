// Bright per-card gradients ported 1:1 from the 2024 portfolio (with dark
// text on top, as in the original). Cycled by index. `variant`-tagged
// projects skip the indexed palette and use their own colours.

const PROJECT_GRADIENTS = [
  "linear-gradient(170deg, #7afff8, #8174f7)",
  "linear-gradient(123deg, #95bef5, #5ad698)",
  "linear-gradient(23deg, #a1f2ff, #dfa3ee)",
  "linear-gradient(170deg, #e1a1ff, #e46565)",
  "linear-gradient(210deg, #b1e9f3, #855ad6)",
  "linear-gradient(150deg, #9eebcb, #d2e69c)",
  "linear-gradient(233deg, #855ad6, #dfa3ee)",
  "linear-gradient(70deg, #1e4eee, #a1f2ff)",
];

const VARIANT_GRADIENTS: Record<string, string> = {
  beatloops: "linear-gradient(135deg, #8b3bff 0%, #ff3b6b 100%)",
};

export const cardGradient = (i: number, variant?: string) =>
  (variant && VARIANT_GRADIENTS[variant]) ??
  PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length];
