export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";
export const localeCookie = "promptary_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "zh" || value === "en";
}

export function localeHtmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function localeOgLocale(locale: Locale): string {
  return locale === "zh" ? "zh_CN" : "en_US";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export function detectLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const code = part.split(";")[0]?.trim().toLowerCase() ?? "";
      if (code.startsWith("en")) return "en";
      if (code.startsWith("zh")) return "zh";
    }
  }

  return defaultLocale;
}
