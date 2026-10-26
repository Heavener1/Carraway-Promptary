import type { Metadata } from "next";

import type { Locale } from "./config";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

function suffixFor(path: string): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function localeAlternates(
  locale: Locale,
  path: string,
): Metadata["alternates"] {
  const base = siteUrl();
  const suffix = suffixFor(path);
  return {
    canonical: `${base}/${locale}${suffix}`,
    languages: {
      "zh-CN": `${base}/zh${suffix}`,
      en: `${base}/en${suffix}`,
      "x-default": `${base}/zh${suffix}`,
    },
  };
}
