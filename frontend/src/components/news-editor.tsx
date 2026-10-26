"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ImagePlus,
  Loader2,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { clientFetch, mediaUrl } from "@/lib/api";
import { NEWS_CATEGORIES } from "@/lib/constants";
import type {
  MediaUploadResponse,
  NewsArticleDetail,
  NewsArticleInput,
  NewsStatus,
} from "@/lib/types";

interface NewsDraft {
  title: string;
  summary: string;
  content: string;
  cover_url: string;
  category: string;
  source_name: string;
  source_url: string;
  status: NewsStatus;
  is_featured: boolean;
}

function toDraft(article: NewsArticleDetail | null): NewsDraft {
  return {
    title: article?.title ?? "",
    summary: article?.summary ?? "",
    content: article?.content ?? "",
    cover_url: article?.cover_url ?? "",
    category: article?.category ?? NEWS_CATEGORIES[0],
    source_name: article?.source_name ?? "",
    source_url: article?.source_url ?? "",
    status: article?.status ?? "draft",
    is_featured: article?.is_featured ?? false,
  };
}

export function NewsEditor({
  article,
  onClose,
  onSaved,
}: {
  article: NewsArticleDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dict } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewsDraft>(() => toDraft(article));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function update<K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const uploaded = await clientFetch<MediaUploadResponse>(
        "/api/v1/media/upload",
        { method: "POST", body },
      );
      update("cover_url", uploaded.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : dict.editor.uploadFailed,
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const saveMutation = useMutation({
    mutationFn: (payload: NewsArticleInput) =>
      clientFetch<NewsArticleDetail>(
        article
          ? `/api/v1/admin/news/${article.id}`
          : "/api/v1/admin/news",
        {
          method: article ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      void queryClient.invalidateQueries({ queryKey: ["news"] });
      onSaved();
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const title = form.title.trim();
    const content = form.content.trim();
    const sourceUrl = form.source_url.trim();

    if (title.length < 2) {
      setError(dict.editor.errorTitle);
      return;
    }
    if (content.length < 10) {
      setError(dict.editor.errorContent);
      return;
    }
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      setError(dict.editor.errorSourceUrl);
      return;
    }

    const payload: NewsArticleInput = {
      title,
      content,
      category: form.category,
      status: form.status,
      is_featured: form.is_featured,
      summary: form.summary.trim() || null,
      cover_url: form.cover_url.trim() || null,
      source_name: form.source_name.trim() || null,
      source_url: sourceUrl || null,
    };
    saveMutation.mutate(payload);
  }

  const cover = mediaUrl(form.cover_url);
  const busy = saveMutation.isPending || uploading;
  const categoryLabels = dict.news.categories as Record<string, string>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="my-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">
              {article ? dict.editor.editTitle : dict.editor.createTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{dict.editor.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">
                {dict.editor.titleLabel}
              </span>
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                required
                minLength={2}
                maxLength={200}
                placeholder={dict.editor.titlePlaceholder}
                className="h-11 w-full rounded-xl border border-border/80 bg-background/60 px-3 text-sm outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">
                {dict.editor.summaryLabel}
              </span>
              <textarea
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
                rows={3}
                maxLength={500}
                placeholder={dict.editor.summaryPlaceholder}
                className="w-full resize-y rounded-xl border border-border/80 bg-background/60 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span>{dict.editor.contentLabel}</span>
                <span className="tabular-nums">{form.content.length} / 50000</span>
              </span>
              <textarea
                value={form.content}
                onChange={(event) => update("content", event.target.value)}
                required
                minLength={10}
                maxLength={50000}
                rows={18}
                placeholder={dict.editor.contentPlaceholder}
                className="w-full resize-y rounded-xl border border-border/80 bg-background/60 px-3 py-3 font-mono text-[13px] leading-7 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
            </label>
          </div>

          <aside className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-xs text-muted">
                {dict.editor.statusLabel}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["draft", dict.editor.draft],
                    ["published", dict.editor.published],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("status", value)}
                    className={`rounded-lg border px-3 py-2 text-xs transition ${
                      form.status === value
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-border/80 text-muted hover:border-accent/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">
                {dict.editor.categoryLabel}
              </span>
              <select
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-background/60 px-2.5 text-sm outline-none transition focus:border-accent/60"
              >
                {NEWS_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category] ?? category}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="block text-xs text-muted">
                {dict.editor.coverLabel}
              </span>
              <div className="overflow-hidden rounded-xl border border-border/80 bg-background/40">
                {cover ? (
                  <div className="relative aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={dict.editor.coverPreview}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => update("cover_url", "")}
                      title={dict.editor.removeCover}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-background/80 text-red-200 backdrop-blur transition hover:bg-red-400/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="grid aspect-[16/9] place-items-center text-xs text-muted">
                    {dict.editor.noCover}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCover(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 px-2 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {dict.editor.uploadCover}
                </button>
              </div>
              <input
                value={form.cover_url}
                onChange={(event) => update("cover_url", event.target.value)}
                placeholder={dict.editor.coverUrlPlaceholder}
                className="h-9 w-full rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs outline-none transition focus:border-accent/60"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2.5 text-xs text-amber-100">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(event) =>
                  update("is_featured", event.target.checked)
                }
                className="accent-amber-300"
              />
              <Star className="h-3.5 w-3.5" />
              {dict.editor.featured}
            </label>

            <div className="space-y-2 border-t border-border/60 pt-4">
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">
                  {dict.editor.sourceNameLabel}
                </span>
                <input
                  value={form.source_name}
                  onChange={(event) =>
                    update("source_name", event.target.value)
                  }
                  maxLength={100}
                  placeholder={dict.editor.sourceNamePlaceholder}
                  className="h-9 w-full rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs outline-none transition focus:border-accent/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">
                  {dict.editor.sourceUrlLabel}
                </span>
                <input
                  value={form.source_url}
                  onChange={(event) =>
                    update("source_url", event.target.value)
                  }
                  maxLength={1000}
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs outline-none transition focus:border-accent/60"
                />
              </label>
            </div>
          </aside>
        </div>

        {error || saveMutation.isError ? (
          <p className="mx-5 mb-4 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs text-red-200">
            {error ??
              (saveMutation.error instanceof Error
                ? saveMutation.error.message
                : dict.editor.saveFailed)}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-background/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50"
          >
            {dict.editor.cancel}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-strong to-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {form.status === "published"
              ? dict.editor.savePublished
              : dict.editor.saveDraft}
          </button>
        </div>
      </form>
    </div>
  );
}
