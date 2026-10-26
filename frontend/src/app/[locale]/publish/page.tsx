import type { Metadata } from "next";

import { PublishForm } from "@/components/publish-form";
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
    title: dict.publish.title,
    description: dict.publish.subtitle,
    alternates: localeAlternates(locale, "/publish"),
  };
}

export default function PublishPage() {
  return (
    <div className="py-4 sm:py-8">
      <PublishForm />
    </div>
  );
}
