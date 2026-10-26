"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Loader2, LogIn } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { clientFetch } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { interpolate } from "@/lib/i18n";
import type { FavoriteListResponse } from "@/lib/types";

import { PromptCard } from "./prompt-card";

export function FavoritesView() {
  const { dict } = useI18n();
  const { data: me, isLoading: meLoading } = useMe();
  const favoritesQuery = useQuery<FavoriteListResponse>({
    queryKey: ["favorites"],
    queryFn: () =>
      clientFetch<FavoriteListResponse>("/api/v1/users/me/favorites?limit=100"),
    enabled: Boolean(me),
    retry: false,
  });

  if (meLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="aspect-[4/5] animate-pulse rounded-2xl bg-surface-2/60"
          />
        ))}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface/40 px-6 py-16 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/10 text-amber-200">
          <Bookmark className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          {dict.favorites.loginTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          {dict.favorites.loginDescription}
        </p>
        <LocalizedLink
          href={`/login?next=${encodeURIComponent("/favorites")}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-strong to-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
        >
          <LogIn className="h-4 w-4" />
          {dict.favorites.login}
        </LocalizedLink>
      </div>
    );
  }

  if (favoritesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {dict.favorites.loading}
      </div>
    );
  }

  if (favoritesQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-6 text-sm text-red-200">
        {favoritesQuery.error.message}
      </div>
    );
  }

  const favorites = favoritesQuery.data?.items ?? [];
  const total = favoritesQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Bookmark className="h-3.5 w-3.5 text-amber-200" />
            {interpolate(dict.favorites.count, { count: total })}
          </div>
          <p className="mt-2 text-sm text-muted">{dict.favorites.note}</p>
        </div>
        <LocalizedLink
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {dict.favorites.discoverMore}
        </LocalizedLink>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted/40" />
          <h2 className="mt-4 text-base font-medium">
            {dict.favorites.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {dict.favorites.emptyDescription}
          </p>
          <LocalizedLink
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2 text-xs font-medium text-accent transition hover:bg-accent/15"
          >
            {dict.favorites.browse}
          </LocalizedLink>
        </div>
      )}
    </div>
  );
}
