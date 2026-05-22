import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default as Dictionary),
  de: () => import("./dictionaries/de.json").then((m) => m.default as Dictionary),
};

export type { Dictionary, Locale };

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const load = dictionaries[locale as Locale] ?? dictionaries.en;
  return load();
};
