import { Newspaper, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { NewsFeed } from "@/components/news-feed";
import { getDictionary, interpolate, type Locale } from "@/lib/i18n";
import {
  defaultLocale,
  isLocale,
  localeOgLocale,
} from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";
import { serverFetch } from "@/lib/server-api";
import type { NewsListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  return {
    title: dict.news.meta.listTitle,
    description: dict.news.meta.listDescription,
    keywords: dict.news.meta.listKeywords,
    alternates: localeAlternates(locale, "/news"),
    openGraph: {
      type: "website",
      locale: localeOgLocale(locale),
      title: `${dict.news.meta.listTitle} · Promptary`,
      description: dict.news.meta.listDescription,
    },
  };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);

  const initialData = await serverFetch<NewsListResponse>(
    "/api/v1/news?limit=12",
  ).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/50 px-6 py-10 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            {dict.news.page.badge}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {dict.news.page.title}
          </h1>
          <p className="mt-3 text-pretty text-sm leading-7 text-muted">
            {dict.news.page.description}
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted">
            <Newspaper className="h-4 w-4 text-accent/70" />
            {interpolate(dict.news.page.count, { count: initialData.total })}
          </div>
        </div>
      </section>

      <NewsFeed initialData={initialData} />
    </div>
  );
}
