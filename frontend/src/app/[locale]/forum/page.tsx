import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { LocalizedLink } from "@/components/locale-link";
import { getDictionary, type Locale } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  return {
    title: dict.forum.title,
    alternates: localeAlternates(locale, "/forum"),
  };
}

export default async function ForumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
        <MessagesSquare className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">{dict.forum.heading}</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        {dict.forum.description}
      </p>
      <LocalizedLink
        href="/"
        className="mt-6 inline-flex rounded-xl border border-border px-4 py-2.5 text-sm transition hover:border-accent/40 hover:text-accent"
      >
        {dict.forum.cta}
      </LocalizedLink>
    </div>
  );
}
