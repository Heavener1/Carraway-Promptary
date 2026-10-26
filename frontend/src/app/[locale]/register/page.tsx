import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
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
    title: dict.nav.register,
    description: dict.auth.registerSubtitle,
    alternates: localeAlternates(locale, "/register"),
  };
}

export default function RegisterPage() {
  return (
    <div className="py-12 sm:py-20">
      <AuthForm mode="register" />
    </div>
  );
}
