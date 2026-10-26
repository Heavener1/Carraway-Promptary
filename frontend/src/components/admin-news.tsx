"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ExternalLink,
  Eye,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { buildQuery, clientFetch, mediaUrl } from "@/lib/api";
import { NEWS_CATEGORY_COLORS } from "@/lib/constants";
import { useMe } from "@/lib/hooks";
import { interpolate } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";
import type {
  NewsArticleDetail,
  NewsArticleSummary,
  NewsListResponse,
  NewsStatus,
} from "@/lib/types";

import { NewsEditor } from "./news-editor";

type StatusFilter = NewsStatus | "all";

const TABS: StatusFilter[] = ["all", "published", "draft"];

export function AdminNews() {
  const { dict, locale } = useI18n();
  const { data: me, isLoading } = useMe();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [editor, setEditor] = useState<{
    article: NewsArticleDetail | null;
  } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const newsQuery = useQuery<NewsListResponse>({
    queryKey: ["admin-news", status, debouncedQuery],
    queryFn: () =>
      clientFetch<NewsListResponse>(
        `/api/v1/admin/news${buildQuery({
          status: status === "all" ? undefined : status,
          q: debouncedQuery || undefined,
          limit: 100,
        })}`,
      ),
    enabled: isAdmin,
  });

  function invalidateLists() {
    void queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    void queryClient.invalidateQueries({ queryKey: ["news"] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: NewsStatus }) =>
      clientFetch<NewsArticleDetail>(`/api/v1/admin/news/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: invalidateLists,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      clientFetch<void>(`/api/v1/admin/news/${id}`, { method: "DELETE" }),
    onSuccess: invalidateLists,
  });

  async function openEditor(id: string) {
    setOpeningId(id);
    setListError(null);
    try {
      const detail = await clientFetch<NewsArticleDetail>(
        `/api/v1/admin/news/${id}`,
      );
      setEditor({ article: detail });
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : dict.adminNews.detailLoadFailed,
      );
    } finally {
      setOpeningId(null);
    }
  }

  function remove(article: NewsArticleSummary) {
    const confirmed = window.confirm(
      interpolate(dict.adminNews.deleteConfirm, { title: article.title }),
    );
    if (confirmed) deleteMutation.mutate(article.id);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface/60" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">{dict.admin.loginRequired}</p>
        <LocalizedLink
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          {dict.admin.login}
        </LocalizedLink>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">{dict.admin.noPermission}</p>
        <LocalizedLink
          href="/"
          className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent/40"
        >
          {dict.admin.backHome}
        </LocalizedLink>
      </div>
    );
  }

  const items = newsQuery.data?.items ?? [];
  const total = newsQuery.data?.total ?? 0;
  const actionError =
    statusMutation.isError || deleteMutation.isError
      ? (statusMutation.error ?? deleteMutation.error)?.message
      : null;
  const categoryLabels = dict.news.categories as Record<string, string>;

  function tabLabel(tab: StatusFilter): string {
    if (tab === "all") return dict.common.all;
    if (tab === "published") return dict.adminNews.statusPublished;
    return dict.adminNews.statusDraft;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Newspaper className="h-5 w-5 text-accent" />
            {dict.adminNews.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {dict.adminNews.description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <LocalizedLink
            href="/admin"
            className="text-muted transition hover:text-accent"
          >
            {dict.adminNews.promptReview}
          </LocalizedLink>
          <LocalizedLink
            href="/news"
            className="text-muted transition hover:text-accent"
          >
            {dict.adminNews.frontNews}
          </LocalizedLink>
          <button
            type="button"
            onClick={() => setEditor({ article: null })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-strong to-accent px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            {dict.adminNews.create}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {TABS.map((tab) => {
            const active = status === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatus(tab)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground"
                }`}
              >
                {tabLabel(tab)}
              </button>
            );
          })}
          <span className="ml-1 self-center text-xs text-muted">
            {interpolate(dict.adminNews.count, { count: total })}
          </span>
        </div>

        <label className="relative block w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dict.adminNews.searchPlaceholder}
            maxLength={100}
            className="h-10 w-full rounded-xl border border-border/80 bg-background/60 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
          />
        </label>
      </div>

      {listError || actionError ? (
        <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {listError ?? actionError}
        </p>
      ) : null}

      {newsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-surface/60"
            />
          ))}
        </div>
      ) : newsQuery.isError ? (
        <div className="rounded-2xl border border-border/80 bg-surface/60 px-6 py-12 text-center text-sm text-muted">
          {dict.adminNews.loadFailed}
          <button
            type="button"
            onClick={() => void newsQuery.refetch()}
            className="ml-1 text-accent"
          >
            {dict.common.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-muted">
            {debouncedQuery || status !== "all"
              ? dict.adminNews.emptyFiltered
              : dict.adminNews.empty}
          </p>
          <button
            type="button"
            onClick={() => setEditor({ article: null })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3.5 py-2 text-sm transition hover:border-accent/40 hover:text-accent"
          >
            <Plus className="h-4 w-4" />
            {dict.adminNews.writeFirst}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((article) => {
            const cover = mediaUrl(article.cover_url);
            const date = formatDate(
              article.published_at ?? article.created_at,
              locale,
            );
            const publishing =
              statusMutation.isPending &&
              statusMutation.variables?.id === article.id;
            const deleting =
              deleteMutation.isPending &&
              deleteMutation.variables === article.id;

            return (
              <article
                key={article.id}
                className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/60 p-4 sm:flex-row"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={article.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Newspaper className="h-5 w-5 text-accent/40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 ${
                        NEWS_CATEGORY_COLORS[article.category] ??
                        "border-border/70 text-muted"
                      }`}
                    >
                      {categoryLabels[article.category] ?? article.category}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 ${
                        article.status === "published"
                          ? "bg-mint/10 text-mint"
                          : "bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {article.status === "published"
                        ? dict.adminNews.statusPublished
                        : dict.adminNews.statusDraft}
                    </span>
                    {article.is_featured ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-200">
                        <Star className="h-3 w-3 fill-current" />
                        {dict.adminNews.featured}
                      </span>
                    ) : null}
                    <span>{article.author.username}</span>
                    <span>·</span>
                    <span>{date}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {article.view_count}
                    </span>
                  </div>

                  <h2 className="mt-1.5 truncate text-sm font-medium">
                    {article.title}
                  </h2>
                  {article.summary ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {article.summary}
                    </p>
                  ) : null}
                  <p className="mt-1 truncate text-[11px] text-muted/80">
                    {article.source_name
                      ? interpolate(dict.adminNews.sourceLabel, {
                          source: article.source_name,
                        })
                      : dict.adminNews.noSource}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-start gap-1.5">
                  {article.status === "published" ? (
                    <LocalizedLink
                      href={`/news/${article.slug}`}
                      title={dict.adminNews.viewPublic}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 text-muted transition hover:border-accent/40 hover:text-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </LocalizedLink>
                  ) : null}
                  <button
                    type="button"
                    title={dict.adminNews.edit}
                    disabled={openingId === article.id}
                    onClick={() => void openEditor(article.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-50"
                  >
                    {openingId === article.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={
                      article.status === "published"
                        ? dict.adminNews.toDraft
                        : dict.adminNews.publish
                    }
                    disabled={publishing}
                    onClick={() =>
                      statusMutation.mutate({
                        id: article.id,
                        next:
                          article.status === "published"
                            ? "draft"
                            : "published",
                      })
                    }
                    className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-50 ${
                      article.status === "published"
                        ? "border-border/70 text-muted hover:border-amber-300/40 hover:text-amber-200"
                        : "border-mint/30 bg-mint/10 text-mint hover:bg-mint/20"
                    }`}
                  >
                    {publishing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : article.status === "published" ? (
                      <Archive className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title={dict.adminNews.delete}
                    disabled={deleting}
                    onClick={() => remove(article)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 text-muted transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editor ? (
        <NewsEditor
          key={editor.article?.id ?? "new"}
          article={editor.article}
          onClose={() => setEditor(null)}
          onSaved={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
