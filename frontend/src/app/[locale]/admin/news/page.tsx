import type { Metadata } from "next";

import { AdminNews } from "@/components/admin-news";
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
    title: dict.adminNews.title,
    description: dict.adminNews.description,
    robots: { index: false, follow: false },
  };
}

export default function AdminNewsPage() {
  return (
    <div className="py-4 sm:py-8">
      <AdminNews />
    </div>
  );
}
