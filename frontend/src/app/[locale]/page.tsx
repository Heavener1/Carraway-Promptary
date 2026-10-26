import { ArrowRight, Layers, Sparkles, Wand2 } from "lucide-react";
import type { Metadata } from "next";

import { LocalizedLink } from "@/components/locale-link";
import { PromptFeed } from "@/components/prompt-feed";
import { getDictionary, type Locale } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";
import { serverFetch } from "@/lib/server-api";
import type { PromptListResponse, TagListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return { alternates: localeAlternates(locale, "/") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);

  const [initialData, initialTags] = await Promise.all([
    serverFetch<PromptListResponse>("/api/v1/prompts?limit=24").catch(() => ({
      items: [],
      next_cursor: null,
    })),
    serverFetch<TagListResponse>("/api/v1/tags?limit=24").catch(() => ({
      items: [],
    })),
  ]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/50 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            {dict.home.badge}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {dict.home.titleLead}
            <span className="text-gradient">{dict.home.titleAccent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-muted sm:text-base">
            {dict.home.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LocalizedLink
              href="/publish"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-strong to-accent px-5 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:brightness-110"
            >
              {dict.home.publishCta}
              <ArrowRight className="h-4 w-4" />
            </LocalizedLink>
            <a
              href="#feed"
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 px-5 py-3 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {dict.home.browseCta}
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-xs text-muted">
            <Feature
              icon={<Wand2 className="h-4 w-4" />}
              label={dict.home.features.modes}
            />
            <Feature
              icon={<Layers className="h-4 w-4" />}
              label={dict.home.features.params}
            />
            <Feature
              icon={<Sparkles className="h-4 w-4" />}
              label={dict.home.features.curated}
            />
          </div>
        </div>
      </section>

      <div id="feed" className="scroll-mt-24">
        <PromptFeed initialData={initialData} initialTags={initialTags.items} />
      </div>
    </div>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
