"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Bookmark,
  CalendarDays,
  Eye,
  Heart,
  ImageIcon,
  MessageCircle,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { clientFetch, mediaUrl } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { formatDate } from "@/lib/i18n/format";
import { localizedPath } from "@/lib/i18n/paths";
import type {
  CommentListResponse,
  FavoriteState,
  LikeState,
  PromptDetail,
  PromptSummary,
} from "@/lib/types";

import { CopyButton } from "./copy-button";
import { PromptCard } from "./prompt-card";
import { PromptComments } from "./prompt-comments";

interface PromptDetailProps {
  prompt: PromptDetail;
  related: PromptSummary[];
  initialComments: CommentListResponse;
}

export function PromptDetailView({
  prompt,
  related,
  initialComments,
}: PromptDetailProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();

  const [liked, setLiked] = useState(prompt.liked);
  const [favorited, setFavorited] = useState(prompt.favorited);
  const [likeCount, setLikeCount] = useState(prompt.like_count);
  const [favoriteCount, setFavoriteCount] = useState(prompt.favorite_count);
  const [commentCount, setCommentCount] = useState(prompt.comment_count);
  const [actionError, setActionError] = useState("");

  const likeMutation = useMutation({
    mutationFn: () =>
      clientFetch<LikeState>(
        `/api/v1/prompts/${encodeURIComponent(prompt.slug)}/like`,
        { method: liked ? "DELETE" : "POST" },
      ),
    onMutate: () => {
      const previous = { liked, count: likeCount };
      setActionError("");
      setLiked(!liked);
      setLikeCount((value) => Math.max(0, value + (liked ? -1 : 1)));
      return previous;
    },
    onError: (error, _variables, previous) => {
      if (previous) {
        setLiked(previous.liked);
        setLikeCount(previous.count);
      }
      setActionError(error.message);
    },
    onSuccess: (state) => {
      setLiked(state.liked);
      setLikeCount(state.like_count);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: () =>
      clientFetch<FavoriteState>(
        `/api/v1/prompts/${encodeURIComponent(prompt.slug)}/favorite`,
        { method: favorited ? "DELETE" : "POST" },
      ),
    onMutate: () => {
      const previous = { favorited, count: favoriteCount };
      setActionError("");
      setFavorited(!favorited);
      setFavoriteCount((value) => Math.max(0, value + (favorited ? -1 : 1)));
      return previous;
    },
    onError: (error, _variables, previous) => {
      if (previous) {
        setFavorited(previous.favorited);
        setFavoriteCount(previous.count);
      }
      setActionError(error.message);
    },
    onSuccess: (state) => {
      setFavorited(state.favorited);
      setFavoriteCount(state.favorite_count);
    },
  });

  function requireLogin(): boolean {
    if (me) return true;
    const target = `/login?next=${encodeURIComponent(
      `/prompts/${prompt.slug}`,
    )}`;
    router.push(localizedPath(locale, target));
    return false;
  }

  function toggleLike() {
    if (!requireLogin()) return;
    likeMutation.mutate();
  }

  function toggleFavorite() {
    if (!requireLogin()) return;
    favoriteMutation.mutate();
  }

  const gallery = useMemo(
    () =>
      prompt.assets.filter((asset) => asset.role === "output").length > 0
        ? prompt.assets.filter((asset) => asset.role === "output")
        : prompt.assets,
    [prompt.assets],
  );
  const inputAssets = useMemo(
    () => prompt.assets.filter((asset) => asset.role === "input"),
    [prompt.assets],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    gallery[0]?.id ?? null,
  );
  const selected = gallery.find((asset) => asset.id === selectedId) ?? gallery[0];

  const params = Object.entries(prompt.params ?? {});
  const paramLabels = dict.params as Record<string, string>;
  const isUnpublished = prompt.status !== "published";
  const categoryLabel = prompt.category
    ? ((dict.categories as Record<string, string>)[prompt.category] ??
      prompt.category)
    : null;

  return (
    <div className="space-y-12">
      {isUnpublished ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <span className="font-medium">{dict.status[prompt.status]}：</span>
          {prompt.status === "pending"
            ? dict.detail.pendingMessage
            : prompt.status === "rejected"
              ? prompt.reject_reason || dict.detail.rejectedFallback
              : dict.detail.draftMessage}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div
            className="relative overflow-hidden rounded-2xl border border-border/80 bg-black/40"
            style={
              selected?.width && selected?.height
                ? { aspectRatio: `${selected.width} / ${selected.height}` }
                : { aspectRatio: "4 / 3" }
            }
          >
            {selected ? (
              selected.media_type === "video" ? (
                <video
                  key={selected.id}
                  src={mediaUrl(selected.url) ?? undefined}
                  poster={mediaUrl(selected.thumb_url) ?? undefined}
                  controls
                  playsInline
                  className="h-full w-full bg-black object-contain"
                />
              ) : (
                <Image
                  src={mediaUrl(selected.url) ?? ""}
                  alt={prompt.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-contain"
                />
              )
            ) : (
              <div className="grid h-full w-full place-items-center">
                <ImageIcon className="h-10 w-10 text-muted/40" />
              </div>
            )}
          </div>

          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {gallery.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                    asset.id === selected?.id
                      ? "border-accent ring-2 ring-accent/25"
                      : "border-border/70 opacity-70 hover:opacity-100"
                  }`}
                >
                  {asset.media_type === "video" ? (
                    <video
                      src={mediaUrl(asset.thumb_url ?? asset.url) ?? undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={mediaUrl(asset.thumb_url ?? asset.url) ?? ""}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          ) : null}

          {inputAssets.length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-medium text-muted">
                {dict.detail.referenceImages}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                {inputAssets.map((asset) => (
                  <a
                    key={asset.id}
                    href={mediaUrl(asset.url) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/70"
                  >
                    <Image
                      src={mediaUrl(asset.url) ?? ""}
                      alt={dict.detail.referenceAlt}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                {dict.promptTypes[prompt.type].label}
              </span>
              {prompt.model ? (
                <span className="rounded-md border border-border/80 px-2 py-1 text-xs text-muted">
                  {prompt.model}
                </span>
              ) : null}
              {categoryLabel ? (
                <span className="rounded-md border border-border/80 px-2 py-1 text-xs text-muted">
                  {categoryLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight">
              {prompt.title}
            </h1>
            {prompt.description ? (
              <p className="mt-3 text-sm leading-7 text-muted">
                {prompt.description}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3 border-y border-border/60 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {prompt.author.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(prompt.author.avatar_url) ?? ""}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm text-accent">
                    {prompt.author.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {prompt.author.username}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-muted">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(
                      prompt.published_at ?? prompt.created_at,
                      locale,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {prompt.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentCount}
                </span>
              </div>
            </div>

            {!isUnpublished ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={meLoading || likeMutation.isPending}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
                    liked
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                      : "border-border/80 text-muted hover:border-rose-400/40 hover:text-rose-300"
                  }`}
                >
                  <Heart
                    className="h-4 w-4"
                    fill={liked ? "currentColor" : "none"}
                  />
                  {liked ? dict.detail.liked : dict.detail.like}
                  <span className="font-mono text-xs">{likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={meLoading || favoriteMutation.isPending}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60 ${
                    favorited
                      ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                      : "border-border/80 text-muted hover:border-amber-300/40 hover:text-amber-200"
                  }`}
                >
                  <Bookmark
                    className="h-4 w-4"
                    fill={favorited ? "currentColor" : "none"}
                  />
                  {favorited ? dict.detail.favorited : dict.detail.favorite}
                  <span className="font-mono text-xs">{favoriteCount}</span>
                </button>
              </div>
            ) : null}

            {actionError ? (
              <p className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {actionError}
              </p>
            ) : null}

            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  {dict.detail.positivePrompt}
                </h2>
                <CopyButton text={prompt.positive_prompt} />
              </div>
              <pre className="scrollbar-thin max-h-72 overflow-auto rounded-xl border border-border/70 bg-background/60 p-4 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-foreground/90">
                {prompt.positive_prompt}
              </pre>
            </section>

            {prompt.negative_prompt ? (
              <section className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-medium">
                    {dict.detail.negativePrompt}
                  </h2>
                  <CopyButton text={prompt.negative_prompt} />
                </div>
                <pre className="scrollbar-thin max-h-48 overflow-auto rounded-xl border border-border/70 bg-background/60 p-4 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-muted">
                  {prompt.negative_prompt}
                </pre>
              </section>
            ) : null}

            {params.length > 0 ? (
              <section className="mt-6">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
                  {dict.detail.generatedParams}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {params.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-border/60 bg-surface/60 px-3 py-2"
                    >
                      <p className="text-[11px] text-muted">
                        {paramLabels[key] ?? key}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {prompt.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            ) : null}

            <LocalizedLink
              href="/publish"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border/80 px-4 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              {dict.detail.usePrompt}
            </LocalizedLink>
          </div>
        </aside>
      </div>

      {!isUnpublished ? (
        <PromptComments
          slug={prompt.slug}
          initialData={initialComments}
          onCountChange={(delta) =>
            setCommentCount((value) => Math.max(0, value + delta))
          }
        />
      ) : null}

      {related.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">{dict.detail.related}</h2>
              <p className="mt-1 text-xs text-muted">
                {dict.detail.relatedHint}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {related.map((item) => (
              <PromptCard key={item.id} prompt={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
