import { defaultLocale, isLocale, type Locale } from "./config";
import { en } from "./en";
import { zh } from "./zh";

export type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function getDictionary(locale: string | Locale): Dictionary {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export { defaultLocale, isLocale, locales } from "./config";
export type { Locale } from "./config";
