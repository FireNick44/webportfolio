import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";

const SITE = "https://a36.dev";

// Per-locale entries for each public route, with hreflang alternates so search
// engines pair the language variants. Keep in sync with the app's routes.
const ROUTES = ["", "/technical"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const languages = (path: string) =>
    Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}${path}`]));

  return ROUTES.flatMap((path) =>
    locales.map((lang) => ({
      url: `${SITE}/${lang}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "" ? (lang === defaultLocale ? 1 : 0.9) : 0.6,
      alternates: { languages: languages(path) },
    })),
  );
}
