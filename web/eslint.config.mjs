import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Project ESLint rules on top of Next.js defaults.
//
// Run:
//   npm run lint            — surface warnings
//   npm run lint -- --fix   — auto-sort imports
//
// AGENTS.md note: pre-existing react-compiler warnings are NOT chased.
// They surface so they're visible but don't fail the lint pass.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Soft size cap — warn, don't fail. Blank lines + comments don't count
      // so a well-commented file isn't punished for its docs. Override for
      // page-shaped files (see the next block) and tests.
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      // Group + alphabetise imports. Auto-fixable via `lint -- --fix`. The
      // `@/**` path-group sits in the `internal` slot before any relative
      // imports, so absolute project imports always cluster together.
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal", position: "before" },
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/newline-after-import": "warn",
      // Cycles bite during folder moves — catch them while refactoring.
      "import/no-cycle": ["warn", { maxDepth: 4 }],
    },
  },
  {
    // Page-shaped files: Next routes. Top-level wiring, not reusable
    // components — exempting them stops a noise storm without lowering the
    // bar for everything else.
    files: ["src/app/**/layout.tsx", "src/app/**/page.tsx"],
    rules: { "max-lines": "off" },
  },
  {
    // Tests frequently have long arrange/act/assert blocks; the cap is for
    // production code only.
    files: ["**/*.test.{ts,tsx}"],
    rules: { "max-lines": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific:
    ".netlify/**",
    "versions/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
