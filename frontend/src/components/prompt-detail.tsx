"use client";

import {
  CalendarDays,
  Eye,
  Heart,
  ImageIcon,
  MessageCircle,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { mediaUrl } from "@/lib/api";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import type { PromptDetail, PromptSummary } from "@/lib/types";

import { CopyButton } from "./copy-button";
import { PromptCard } from "./prompt-card";

const PARAM_LABELS: Record<string, string> = {
  steps: "步数",
  cfg: "引导系数",
  seed: "种子",
  aspect_ratio: "宽高比",
  sampler: "采样器",
  duration: "时长",
  fps: "帧率",
  strength: "重绘幅度",
};

interface PromptDetailProps {
  prompt: PromptDetail;
  related: PromptSummary[];
}

export function PromptDetailView({ prompt, related }: PromptDetailProps) {
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
  const isUnpublished = prompt.status !== "published";

  return (
    <div className="space-y-12">
      {isUnpublished ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <span className="font-medium">
            {STATUS_LABELS[prompt.status]}：
          </span>
          {prompt.status === "pending"
            ? "内容正在审核中，目前仅你和管理员可见。"
            : prompt.status === "rejected"
              ? prompt.reject_reason || "内容未通过审核，请修改后重新提交。"
              : "这是一份草稿，完善后提交审核即可公开展示。"}
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
              <h2 className="mb-3 text-sm font-medium text-muted">参考图</h2>
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
                      alt="参考图"
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
                {TYPE_LABELS[prompt.type]}
              </span>
              {prompt.model ? (
                <span className="rounded-md border border-border/80 px-2 py-1 text-xs text-muted">
                  {prompt.model}
                </span>
              ) : null}
              {prompt.category ? (
                <span className="rounded-md border border-border/80 px-2 py-1 text-xs text-muted">
                  {prompt.category}
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
                    {(prompt.published_at ?? prompt.created_at).slice(0, 10)}
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
                  {prompt.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {prompt.comment_count}
                </span>
              </div>
            </div>

            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">正向提示词</h2>
                <CopyButton text={prompt.positive_prompt} label="复制" />
              </div>
              <pre className="scrollbar-thin max-h-72 overflow-auto rounded-xl border border-border/70 bg-background/60 p-4 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-foreground/90">
                {prompt.positive_prompt}
              </pre>
            </section>

            {prompt.negative_prompt ? (
              <section className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-medium">负向提示词</h2>
                  <CopyButton
                    text={prompt.negative_prompt}
                    label="复制"
                  />
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
                  生成参数
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {params.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-border/60 bg-surface/60 px-3 py-2"
                    >
                      <p className="text-[11px] text-muted">
                        {PARAM_LABELS[key] ?? key}
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

            <Link
              href="/publish"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border/80 px-4 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              也用这个提示词创作
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">相关灵感</h2>
              <p className="mt-1 text-xs text-muted">
                同类型或相近标签的提示词
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
