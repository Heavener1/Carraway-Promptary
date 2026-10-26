import type { Metadata } from "next";

import { AdminAssistant } from "@/components/admin-assistant";
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
    title: dict.adminAssistant.title,
    description: dict.adminAssistant.description,
    robots: { index: false, follow: false },
  };
}

export default function AdminAssistantPage() {
  return (
    <div className="py-4 sm:py-8">
      <AdminAssistant />
    </div>
  );
}
