import { Eye, Heart, MessageCircle, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { mediaUrl } from "@/lib/api";
import { TYPE_LABELS } from "@/lib/constants";
import type { PromptSummary } from "@/lib/types";

export function PromptCard({ prompt }: { prompt: PromptSummary }) {
  const cover = mediaUrl(prompt.cover_url);
  const isVideo = prompt.cover_media_type === "video";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/80 bg-surface/70 transition duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5">
      <Link href={`/prompts/${prompt.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          {cover ? (
            isVideo ? (
              <video
                src={cover}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <Image
                src={cover}
                alt={prompt.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            )
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 via-surface to-background">
              <Sparkles className="h-8 w-8 text-accent/50" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            {TYPE_LABELS[prompt.type]}
          </span>
          {isVideo ? (
            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          ) : null}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {prompt.model ? (
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
              {prompt.model}
            </span>
          ) : null}
          {prompt.category ? (
            <span className="text-[11px] text-muted">{prompt.category}</span>
          ) : null}
        </div>

        <Link href={`/prompts/${prompt.slug}`}>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition group-hover:text-accent">
            {prompt.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            {prompt.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(prompt.author.avatar_url) ?? ""}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] text-accent">
                {prompt.author.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{prompt.author.username}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
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
          </span>
        </div>
      </div>
    </article>
  );
}
