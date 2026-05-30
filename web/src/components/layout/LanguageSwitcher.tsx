"use client";

import { usePathname, useRouter } from "next/navigation";

import { locales, localeMetadata, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useAppStore";

export function LanguageSwitcher({ lang }: { lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const setLanguage = useAppStore((s) => s.setLanguage);

  const switchTo = (l: Locale) => {
    if (l === lang) return;
    setLanguage(l);
    const segments = pathname.split("/");
    segments[1] = l;
    router.push(segments.join("/") || `/${l}`);
  };

  return (
    // Uses currentColor (opacity for active/inactive) so it adapts to whatever
    // text colour its container sets — inverted header or normal menu footer.
    <div className="flex items-center gap-2 font-mono text-xs text-current">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 && <span className="opacity-40">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            aria-current={lang === l}
            className={cn(
              "uppercase tracking-[0.25em] transition-opacity",
              lang === l ? "opacity-100" : "opacity-55 hover:opacity-100",
            )}
          >
            {localeMetadata[l].short}
          </button>
        </span>
      ))}
    </div>
  );
}
