import { ArrowLeft, ArrowUpRight, Eye, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { NewsCard } from "@/components/news-card";
import { NewsContent } from "@/components/news-content";
import { mediaUrl } from "@/lib/api";
import { NEWS_CATEGORY_COLORS } from "@/lib/constants";
import { serverFetch } from "@/lib/server-api";
import type { NewsArticleDetail, NewsListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const getArticle = cache(async (slug: string, trackView = true) => {
  const query = trackView ? "" : "?track_view=false";
  return serverFetch<NewsArticleDetail>(
    `/api/v1/news/${encodeURIComponent(slug)}${query}`,
  );
});

function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${path}`;
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getArticle(slug, false);
    const image = absoluteMediaUrl(article.cover_url);
    const description =
      article.summary ??
      `${article.content.slice(0, 150)}${article.content.length > 150 ? "…" : ""}`;

    return {
      title: article.title,
      description,
      openGraph: {
        type: "article",
        title: article.title,
        description,
        publishedTime: article.published_at ?? undefined,
        authors: [article.author.username],
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: "AI 资讯" };
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article: NewsArticleDetail | null = null;
  try {
    article = await getArticle(slug);
  } catch {
    notFound();
  }
  if (!article) notFound();

  const related = await serverFetch<NewsListResponse>(
    `/api/v1/news?category=${encodeURIComponent(article.category)}&limit=4`,
  ).catch(() => ({ items: [], total: 0 }));

  const cover = mediaUrl(article.cover_url);
  const published = article.published_at ?? article.created_at;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    image: absoluteMediaUrl(article.cover_url),
    datePublished: published,
    dateModified: article.updated_at,
    author: {
      "@type": "Person",
      name: article.author.username,
    },
    publisher: {
      "@type": "Organization",
      name: "Promptary",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <article className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          返回资讯
        </Link>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-md border px-2 py-1 ${
                NEWS_CATEGORY_COLORS[article.category] ??
                "border-border/70 bg-surface-2 text-muted"
              }`}
            >
              {article.category}
            </span>
            {article.is_featured ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-300/90 px-2 py-1 text-background">
                <Star className="h-3 w-3 fill-current" />
                编辑精选
              </span>
            ) : null}
          </div>

          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
            {article.title}
          </h1>

          {article.summary ? (
            <p className="max-w-3xl text-pretty text-base leading-7 text-muted">
              {article.summary}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 pb-5 text-xs text-muted">
            <span>{published.slice(0, 10)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {article.view_count} 次阅读
            </span>
            <span>·</span>
            <span>作者 {article.author.username}</span>
            {article.source_name ? (
              <>
                <span>·</span>
                <span>来源 {article.source_name}</span>
              </>
            ) : null}
          </div>
        </header>

        {cover ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={article.title}
              className="aspect-[16/8] h-auto w-full object-cover"
            />
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-surface/40 px-5 py-6 sm:px-8 sm:py-8">
          <NewsContent content={article.content} />
        </div>

        {article.source_url ? (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center justify-between gap-4 rounded-2xl border border-accent/25 bg-accent/5 px-5 py-4 text-sm transition hover:border-accent/50 hover:bg-accent/10"
          >
            <span>
              <span className="block text-xs text-muted">原文来源</span>
              <span className="mt-0.5 font-medium text-accent">
                {article.source_name ?? article.source_url}
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-accent" />
          </a>
        ) : null}

        <footer className="border-t border-border/60 pt-5 text-xs text-muted">
          本文由 Promptary 编辑整理，转载请注明来源。
        </footer>
      </article>

      {related.items.filter((item) => item.id !== article.id).length > 0 ? (
        <section className="mx-auto mt-14 max-w-6xl space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">相关资讯</h2>
            <Link
              href="/news"
              className="text-xs text-muted transition hover:text-accent"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.items
              .filter((item) => item.id !== article.id)
              .slice(0, 3)
              .map((item) => (
                <NewsCard key={item.id} article={item} />
              ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
