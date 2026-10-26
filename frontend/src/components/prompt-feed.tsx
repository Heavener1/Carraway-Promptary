"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildQuery, clientFetch } from "@/lib/api";
import { PROMPT_TYPES, SORT_OPTIONS } from "@/lib/constants";
import type {
  PromptListResponse,
  PromptType,
  Tag,
} from "@/lib/types";

import { PromptCard } from "./prompt-card";

const PAGE_SIZE = 24;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface PromptFeedProps {
  initialData: PromptListResponse;
  initialTags: Tag[];
}

export function PromptFeed({ initialData, initialTags }: PromptFeedProps) {
  const [type, setType] = useState<PromptType | "">("");
  const [sort, setSort] = useState<SortValue>("latest");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const isDefault = !type && !tag && !debouncedQuery && sort === "latest";

  const promptsQuery = useInfiniteQuery({
    queryKey: ["prompts", type, sort, tag, debouncedQuery],
    queryFn: ({ pageParam }) =>
      clientFetch<PromptListResponse>(
        `/api/v1/prompts${buildQuery({
          type: type || undefined,
          sort,
          tag: tag || undefined,
          q: debouncedQuery || undefined,
          cursor: pageParam,
          limit: PAGE_SIZE,
        })}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    placeholderData: (previous) => previous,
    initialData: isDefault
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !promptsQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !promptsQuery.isFetchingNextPage) {
          void promptsQuery.fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    promptsQuery.hasNextPage,
    promptsQuery.isFetchingNextPage,
    promptsQuery.fetchNextPage,
  ]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return (promptsQuery.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [promptsQuery.data]);

  const hasFilters = Boolean(type || tag || debouncedQuery || sort !== "latest");

  function resetFilters() {
    setType("");
    setSort("latest");
    setTag("");
    setQuery("");
    setDebouncedQuery("");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索提示词、风格、模型…"
            className="h-11 w-full rounded-xl border border-border/80 bg-surface/80 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-foreground"
              aria-label="清空搜索"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortValue)}
            className="h-11 rounded-xl border border-border/80 bg-surface/80 px-3 text-sm text-foreground outline-none transition focus:border-accent/60"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border/80 px-3 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <FilterPill active={!type} onClick={() => setType("")}>
          全部
        </FilterPill>
        {PROMPT_TYPES.map((option) => (
          <FilterPill
            key={option.value}
            active={type === option.value}
            onClick={() => setType(option.value)}
          >
            {option.label}
            <span className="ml-1.5 text-[10px] opacity-60">{option.short}</span>
          </FilterPill>
        ))}
      </div>

      {initialTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {initialTags.slice(0, 14).map((item) => {
            const active = tag === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTag(active ? "" : item.slug)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-border/60 text-muted hover:border-accent/30 hover:text-foreground"
                }`}
              >
                #{item.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {promptsQuery.isPlaceholderData
            ? "筛选中…"
            : `共展示 ${items.length} 条${hasFilters ? "匹配结果" : "最新提示词"}`}
        </span>
        {promptsQuery.isFetching && !promptsQuery.isFetchingNextPage ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            更新中
          </span>
        ) : null}
      </div>

      {promptsQuery.isLoading ? (
        <SkeletonGrid />
      ) : promptsQuery.isError ? (
        <div className="rounded-2xl border border-border/80 bg-surface/60 px-6 py-16 text-center">
          <p className="text-sm text-muted">加载失败，请确认后端服务已启动。</p>
          <button
            type="button"
            onClick={() => void promptsQuery.refetch()}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent/40 hover:text-accent"
          >
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface/40 px-6 py-20 text-center">
          <p className="text-base font-medium">还没有匹配的提示词</p>
          <p className="mt-2 text-sm text-muted">
            换个关键词或分类试试，也可以成为第一个分享者。
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            查看全部
          </button>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {items.map((item) => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <PromptCard prompt={item} />
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
      {promptsQuery.isFetchingNextPage ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载更多…
        </div>
      ) : null}
      {!promptsQuery.hasNextPage && items.length > 0 ? (
        <p className="py-4 text-center text-xs text-muted/70">已经到底了</p>
      ) : null}
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border/70 bg-surface/40 text-muted hover:border-accent/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  const heights = [320, 260, 300, 240, 300, 280, 340, 260];
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {heights.map((height, index) => (
        <div
          key={index}
          className="mb-4 break-inside-avoid animate-pulse rounded-2xl border border-border/50 bg-surface/50"
          style={{ height }}
        />
      ))}
    </div>
  );
}
