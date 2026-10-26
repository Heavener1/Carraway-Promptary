"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  isLocale,
  localeCookie,
  locales,
  type Locale,
} from "@/lib/i18n/config";
import { localizedPath, stripLocaleFromPath } from "@/lib/i18n/paths";

import { useI18n } from "./i18n-provider";

const labels: Record<Locale, string> = {
  zh: "简体中文",
  en: "English",
};

export function LocaleSwitcher() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(next: string) {
    if (!isLocale(next) || next === locale) return;

    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    const search = typeof window === "undefined" ? "" : window.location.search;
    const nextPath = localizedPath(next, stripLocaleFromPath(pathname));
    router.push(`${nextPath}${search}`);
  }

  return (
    <label
      title={dict.locale.switchAria}
      className="relative inline-flex h-9 items-center rounded-lg border border-border/80 text-muted transition hover:border-accent/40 hover:text-foreground"
    >
      <Languages className="pointer-events-none absolute left-2.5 h-3.5 w-3.5" />
      <span className="sr-only">{dict.locale.switchAria}</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value)}
        aria-label={dict.locale.switchAria}
        className="h-full cursor-pointer appearance-none bg-transparent py-0 pl-8 pr-3 text-xs outline-none"
      >
        {locales.map((item) => (
          <option key={item} value={item} className="bg-surface text-foreground">
            {labels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
