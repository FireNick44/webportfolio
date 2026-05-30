"use client";

import Link from "next/link";
import { ArrowUp, Mail, Shuffle } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { WaveDivider } from "@/components/ui/WaveDivider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeTogglerButton } from "@/components/theme/ThemeTogglerButton";
import { buildInfo } from "@/lib/buildInfo";
import { shuffleTheme, scrollToTop } from "@/lib/shuffleTheme";
import { useAppStore } from "@/store/useAppStore";

const GITHUB_URL = "https://github.com/FireNick44";
const PROJECT_AWARE_URL = "https://www.projectaware.org/";
const SUPPORT_EMAIL = "support@sleepingdeveloper.com";

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

const stats = buildInfo.stats;
const STAT_COLS: { label: string; items: { text: string; href?: string }[] }[] =
  [
    {
      label: "//made with",
      items: [
        { text: "Next" },
        { text: "Matter" },
        { text: "TypeScript" },
        { text: "Tailwind CSS" },
        { text: "Figma" },
        { text: "Claude" },
      ],
    },
    {
      label: "//files",
      items: [
        { text: `${stats.srcFiles} source files` },
        { text: `~${stats.srcKb} KB of code` },
        { text: `${stats.commits} commits` },
        { text: "a lot of coffee" },
        { text: "1 hidden reagent" },
      ],
    },
    {
      label: "//others",
      items: [
        { text: "GitHub", href: GITHUB_URL },
        { text: "Project AWARE", href: PROJECT_AWARE_URL },
      ],
    },
  ];

/** Licensing strip "under the sand". Four-column top (stats + appearance on the
 *  right), a single-line legal row underneath, and finally a three-up bottom
 *  row: © left, version center, back-to-top right. */
export function OutroFooterBar({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const requestLoader = useAppStore((s) => s.requestLoader);
  return (
    <div
      data-outro-footerbar
      className="relative bg-background text-foreground"
    >
      {/* Animated wave rising up toward the sand. Themed to the page bg. */}
      <WaveDivider
        fill="var(--background)"
        height="clamp(22px, 3.2vw, 34px)"
        seed={9}
        className="pointer-events-none absolute inset-x-0 bottom-full z-[1]"
      />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {/* End-of-page row. No box — title + body on the left, secondary Top +
            primary Shuffle+Top on the right, separated from the columns below
            by a single bottom-border + pb-6. */}
        <div className="mb-10 flex flex-col items-start gap-4 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 max-w-prose">
            <p className="font-display text-lg font-bold tracking-tight">
              {dict.notify.shuffleTitle}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {dict.notify.shuffleBody}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-stretch gap-2">
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={dict.notify.backToTopAction}
              title={dict.notify.backToTopAction}
              className="group inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 border border-foreground/25 px-3 text-current/80 transition-colors hover:border-foreground/70 hover:text-foreground"
            >
              <ArrowUp size={14} aria-hidden />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em]">
                {dict.notify.backToTopAction}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Order matters: loader first, scroll behind it. Bump the
                // loader BEFORE the swap so the curtain drops, then change the
                // theme (loader's bg picks up the new colour via CSS var),
                // then wait one paint for the loader to actually cover the page
                // before snap-scrolling. The CSS fade-in is killed for replays
                // (see .boot-loader in globals.css), so one rAF is enough to
                // hide the scroll completely. behavior:"auto" snap since the
                // scroll happens under the curtain anyway.
                requestLoader();
                shuffleTheme();
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: "auto" });
                  });
                });
              }}
              className="group inline-flex h-10 cursor-pointer items-center justify-center gap-2 border border-foreground bg-foreground px-4 text-background transition-opacity hover:opacity-85"
            >
              <Shuffle size={15} aria-hidden />
              <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em]">
                {dict.notify.shuffleAction}
              </span>
            </button>
          </div>
        </div>

        {/* Top: 4 columns — `<code>`/<files>/<others>/<appearance>. Appearance
            sits on the right; its label stays English in both locales (user
            preference), but the inner labels are localised. */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {STAT_COLS.map((c) => (
            <div key={c.label} className="flex flex-col gap-2">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-current/55">
                {c.label}
              </span>
              <ul className="space-y-1 text-sm">
                {c.items.map((it) => (
                  <li key={it.text}>
                    {it.href ? (
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 border-b border-transparent text-current/85 transition-colors hover:border-foreground/60 hover:text-current"
                      >
                        {it.text === "GitHub" && <GithubMark />}
                        <span>{it.text}</span>
                      </a>
                    ) : (
                      <span className="text-current/85">{it.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Appearance column — language + theme. Stretches the full column
              height (grid items already stretch); rows distribute vertically
              with `justify-between` so the two controls aren't crammed at the
              top with empty air below. */}
          <div className="flex h-full flex-col gap-3">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-current/55">
              //appearance
            </span>
            <ul className="flex flex-col gap-4 pt-1 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-current/55">
                  {dict.menu.language}
                </span>
                <LanguageSwitcher lang={lang} />
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-current/55">
                  {dict.menu.theme}
                </span>
                <ThemeTogglerButton size="sm" />
              </li>
            </ul>
          </div>
        </div>

        {/* Single bottom strip: © left · version CENTRE · legal links right.
            Three-column grid on `sm` so the version is true-centred regardless
            of the rights/legal widths; stacks on mobile. */}
        <div
          data-outro-legal
          className="mt-6 grid grid-cols-1 items-center gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-[1fr_auto_1fr]"
        >
          <span className="font-display text-sm font-bold tracking-tight sm:justify-self-start">
            {dict.footer.rights.replace(
              "{year}",
              String(new Date().getFullYear()),
            )}
          </span>

          <span
            className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-current/40 sm:justify-self-center"
            title={`Build ${buildInfo.gitSha}`}
          >
            v{buildInfo.version}
          </span>

          {/* Legal links — right-aligned column. */}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-self-end">
            <li>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-1.5 border-b border-transparent text-current/85 transition-colors hover:border-foreground/60 hover:text-current"
              >
                <Mail size={12} aria-hidden />
                <span>{SUPPORT_EMAIL}</span>
              </a>
            </li>
            <li aria-hidden className="text-current/30">
              ·
            </li>
            <li>
              <Link
                href={`/${lang}/datenschutz`}
                className="border-b border-transparent text-current/85 transition-colors hover:border-foreground/60 hover:text-current"
              >
                {dict.footer.privacy}
              </Link>
            </li>
            <li aria-hidden className="text-current/30">
              ·
            </li>
            <li>
              <Link
                href={`/${lang}/impressum`}
                className="border-b border-transparent text-current/85 transition-colors hover:border-foreground/60 hover:text-current"
              >
                {dict.footer.impressum}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
