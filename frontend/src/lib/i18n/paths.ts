import { isLocale, type Locale } from "./config";

const EXTERNAL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function localizedPath(locale: Locale, path: string): string {
  if (!path) return `/${locale}`;
  if (path.startsWith("#") || EXTERNAL_PATTERN.test(path)) return path;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;

  const firstSegment = normalized.split("/")[1];
  if (isLocale(firstSegment)) return normalized;

  return `/${locale}${normalized}`;
}

export function stripLocaleFromPath(pathname: string): string {
  const parts = pathname.split("/");
  if (!isLocale(parts[1])) return pathname || "/";

  const rest = `/${parts.slice(2).join("/")}`.replace(/\/+$/, "");
  return rest || "/";
}
