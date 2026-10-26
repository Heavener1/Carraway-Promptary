import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { AssistantWidget } from "@/components/assistant-widget";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, locales, type Locale } from "@/lib/i18n";
import {
  defaultLocale,
  isLocale,
  localeHtmlLang,
  localeOgLocale,
} from "@/lib/i18n/config";

import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  const alternate = locales
    .filter((item) => item !== locale)
    .map(localeOgLocale);

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: dict.meta.title,
      template: "%s · Promptary",
    },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    openGraph: {
      type: "website",
      locale: localeOgLocale(locale),
      alternateLocale: alternate,
      siteName: "Promptary",
      title: dict.meta.title,
      description: dict.meta.ogDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.ogDescription,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return (
    <html lang={localeHtmlLang(locale)}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers locale={locale}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
            {dict.footer}
          </footer>
          <AssistantWidget />
        </Providers>
      </body>
    </html>
  );
}
