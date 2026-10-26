"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { buildQuery, clientFetch } from "@/lib/api";
import { NEWS_CATEGORIES } from "@/lib/constants";
import { interpolate } from "@/lib/i18n";
import type { NewsListResponse } from "@/lib/types";

import { NewsCard } from "./news-card";

const PAGE_SIZE = 12;
const ALL_CATEGORIES = "";

export function NewsFeed({
  initialData,
}: {
  initialData: NewsListResponse;
}) {
  const { dict } = useI18n();
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const isDefaultQuery = category === ALL_CATEGORIES && !debouncedQuery;

  const newsQuery = useInfiniteQuery({
    queryKey: ["news", category, debouncedQuery],
    queryFn: ({ pageParam }) =>
      clientFetch<NewsListResponse>(
        `/api/v1/news${buildQuery({
          category: category || undefined,
          q: debouncedQuery || undefined,
          limit: PAGE_SIZE,
          offset: pageParam,
        })}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.items.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialData: isDefaultQuery
      ? { pages: [initialData], pageParams: [0] }
      : undefined,
    placeholderData: keepPreviousData,
  });

  const articles =
    newsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = newsQuery.data?.pages[0]?.total ?? 0;
  const categoryLabels = dict.news.categories as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {[ALL_CATEGORIES, ...NEWS_CATEGORIES].map((item) => {
            const active = category === item;
            return (
              <button
                key={item || "all"}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground"
                }`}
              >
                {item ? (categoryLabels[item] ?? item) : dict.common.all}
              </button>
            );
          })}
        </div>

        <label className="relative block w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dict.news.feed.searchPlaceholder}
            maxLength={100}
            className="h-10 w-full rounded-xl border border-border/80 bg-background/60 pl-9 pr-9 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={dict.feed.clearSearch}
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{interpolate(dict.news.page.count, { count: total })}</span>
        {newsQuery.isFetching && !newsQuery.isFetchingNextPage ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {dict.news.feed.updating}
          </span>
        ) : null}
      </div>

      {newsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl bg-surface-2/60"
            />
          ))}
        </div>
      ) : newsQuery.isError ? (
        <div className="rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-10 text-center text-sm text-red-200">
          {dict.news.feed.loadError}
          <button
            type="button"
            onClick={() => void newsQuery.refetch()}
            className="ml-1 underline"
          >
            {dict.common.retry}
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
          <p className="text-sm text-muted">{dict.news.feed.empty}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {newsQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void newsQuery.fetchNextPage()}
                disabled={newsQuery.isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 px-5 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-foreground disabled:cursor-wait disabled:opacity-60"
              >
                {newsQuery.isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {dict.news.feed.loadMore}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
