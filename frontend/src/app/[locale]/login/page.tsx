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
    title: dict.nav.login,
    description: dict.auth.loginSubtitle,
    alternates: localeAlternates(locale, "/login"),
  };
}

export default function LoginPage() {
  return (
    <div className="py-12 sm:py-20">
      <AuthForm mode="login" />
    </div>
  );
}
