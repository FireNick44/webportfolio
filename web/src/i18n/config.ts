export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeMetadata: Record<Locale, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  de: { label: "Deutsch", short: "DE" },
};
