"use client";

import { Eye, Newspaper, Star } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { mediaUrl } from "@/lib/api";
import { NEWS_CATEGORY_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/i18n/format";
import type { NewsArticleSummary } from "@/lib/types";

export function NewsCard({ article }: { article: NewsArticleSummary }) {
  const { dict, locale } = useI18n();
  const cover = mediaUrl(article.cover_url);
  const date = formatDate(article.published_at ?? article.created_at, locale);
  const categoryLabel =
    (dict.news.categories as Record<string, string>)[article.category] ??
    article.category;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/80 bg-surface/60 transition duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5">
      <LocalizedLink href={`/news/${article.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 via-surface to-background">
              <Newspaper className="h-8 w-8 text-accent/40" />
            </div>
          )}
          <span
            className={`absolute left-3 top-3 rounded-md border px-2 py-1 text-[11px] font-medium backdrop-blur ${
              NEWS_CATEGORY_COLORS[article.category] ??
              "border-white/10 bg-black/50 text-white"
            }`}
          >
            {categoryLabel}
          </span>
          {article.is_featured ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-amber-300/90 px-2 py-1 text-[11px] font-medium text-background">
              <Star className="h-3 w-3 fill-current" />
              {dict.news.card.featured}
            </span>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>{date}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.view_count}
            </span>
          </div>

          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug transition group-hover:text-accent">
            {article.title}
          </h3>

          {article.summary ? (
            <p className="line-clamp-2 text-xs leading-6 text-muted">
              {article.summary}
            </p>
          ) : null}

          <p className="truncate text-[11px] text-muted/80">
            {article.source_name ?? article.author.username}
          </p>
        </div>
      </LocalizedLink>
    </article>
  );
}
