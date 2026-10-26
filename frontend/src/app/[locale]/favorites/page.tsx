import type { Metadata } from "next";

import { FavoritesView } from "@/components/favorites-view";
import { getDictionary, type Locale } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  return {
    title: dict.favorites.pageTitle,
    description: dict.favorites.pageDescription,
    robots: { index: false, follow: false },
  };
}

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-4 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dict.favorites.pageTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {dict.favorites.pageDescription}
        </p>
      </div>
      <FavoritesView />
    </div>
  );
}
