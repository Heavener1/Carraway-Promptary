"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  LogIn,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { clientFetch, mediaUrl } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type {
  CommentListResponse,
  PromptComment,
} from "@/lib/types";

interface PromptCommentsProps {
  slug: string;
  initialData: CommentListResponse;
  onCountChange: (delta: number) => void;
}

export function PromptComments({
  slug,
  initialData,
  onCountChange,
}: PromptCommentsProps) {
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useMe();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const commentsQuery = useQuery<CommentListResponse>({
    queryKey: ["comments", slug],
    queryFn: () =>
      clientFetch<CommentListResponse>(
        `/api/v1/prompts/${encodeURIComponent(slug)}/comments?limit=100`,
      ),
    initialData,
  });

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      clientFetch<PromptComment>(
        `/api/v1/prompts/${encodeURIComponent(slug)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: text }),
        },
      ),
    onSuccess: (comment) => {
      setContent("");
      setError("");
      queryClient.setQueryData<CommentListResponse>(
        ["comments", slug],
        (old) => ({
          items: [comment, ...(old?.items ?? [])],
          total: (old?.total ?? 0) + 1,
        }),
      );
      onCountChange(1);
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      clientFetch<void>(`/api/v1/comments/${commentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, commentId) => {
      setError("");
      queryClient.setQueryData<CommentListResponse>(
        ["comments", slug],
        (old) => ({
          items: (old?.items ?? []).filter((item) => item.id !== commentId),
          total: Math.max(0, (old?.total ?? 1) - 1),
        }),
      );
      onCountChange(-1);
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    createMutation.mutate(text);
  }

  const comments = commentsQuery.data?.items ?? [];
  const total = commentsQuery.data?.total ?? 0;
  const loginHref = `/login?next=${encodeURIComponent(
    `/prompts/${slug}#comments`,
  )}`;

  return (
    <section
      id="comments"
      className="scroll-mt-24 rounded-2xl border border-border/70 bg-surface/40 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageCircle className="h-4.5 w-4.5 text-accent" />
            讨论
          </h2>
          <p className="mt-1 text-xs text-muted">
            {total > 0 ? `${total} 条讨论` : "还没有讨论，来分享你的想法"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {meLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-2/70" />
        ) : me ? (
          <form onSubmit={submit} className="space-y-2">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="聊聊生成效果、参数细节，或者给作者一点反馈…"
              className="w-full resize-y rounded-xl border border-border/80 bg-background/60 px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">
                {content.length} / 2000
              </span>
              <button
                type="submit"
                disabled={createMutation.isPending || !content.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-strong to-accent px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                发布评论
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
            <p className="text-sm text-muted">登录后参与讨论</p>
            <Link
              href={loginHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/15"
            >
              <LogIn className="h-3.5 w-3.5" />
              登录
            </Link>
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {commentsQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl bg-surface-2/60"
              />
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-border/60 bg-background/35 p-4"
            >
              <div className="flex items-start gap-3">
                {comment.author.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(comment.author.avatar_url) ?? ""}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm text-accent">
                    {comment.author.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">
                      {comment.author.username}
                    </span>
                    <span className="text-[11px] text-muted">
                      {comment.created_at.replace("T", " ").slice(0, 16)}
                    </span>
                    {comment.is_mine || me?.role === "admin" ? (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(comment.id)}
                        disabled={deleteMutation.isPending}
                        title="删除评论"
                        className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">
                    {comment.content}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted">
            还没有评论
          </div>
        )}
      </div>
    </section>
  );
}
