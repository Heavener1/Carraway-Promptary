"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Newspaper,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { buildQuery, clientFetch, mediaUrl } from "@/lib/api";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/constants";
import { useMe } from "@/lib/hooks";
import type {
  AdminPromptListResponse,
  AdminStats,
  PromptDetail,
  PromptStatus,
} from "@/lib/types";

const TABS: { value: PromptStatus; label: string }[] = [
  { value: "pending", label: "待审核" },
  { value: "published", label: "已发布" },
  { value: "rejected", label: "已驳回" },
  { value: "draft", label: "草稿" },
];

export function AdminDashboard() {
  const { data: me, isLoading } = useMe();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PromptStatus>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isAdmin = me?.role === "admin";

  const statsQuery = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => clientFetch<AdminStats>("/api/v1/admin/stats"),
    enabled: isAdmin,
  });

  const promptsQuery = useQuery<AdminPromptListResponse>({
    queryKey: ["admin-prompts", status],
    queryFn: () =>
      clientFetch<AdminPromptListResponse>(
        `/api/v1/admin/prompts${buildQuery({ status, limit: 100 })}`,
      ),
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    }) =>
      clientFetch<PromptDetail>(`/api/v1/admin/prompts/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      }),
    onSuccess: () => {
      setRejectingId(null);
      setRejectReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin-prompts"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

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
        <p className="text-sm text-muted">请先登录管理员账号。</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          去登录
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">当前账号没有管理员权限。</p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent/40"
        >
          返回首页
        </Link>
      </div>
    );
  }

  const stats = statsQuery.data;
  const promptItems = promptsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">内容审核</h1>
          <p className="mt-1.5 text-sm text-muted">
            审核用户提交的提示词，维护社区内容质量。
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/admin/news"
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
          >
            <Newspaper className="h-4 w-4" />
            资讯管理
          </Link>
          <Link
            href="/"
            className="text-muted transition hover:text-accent"
          >
            返回前台
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="提示词总数"
          value={stats?.total_prompts ?? 0}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="待审核"
          value={stats?.pending ?? 0}
          accent
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="已发布"
          value={stats?.published ?? 0}
        />
        <StatCard
          icon={<XCircle className="h-4 w-4" />}
          label="已驳回"
          value={stats?.rejected ?? 0}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="用户总数"
          value={stats?.total_users ?? 0}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setRejectingId(null);
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
                active
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border/70 text-muted hover:border-accent/30 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {promptsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-surface/60"
            />
          ))}
        </div>
      ) : promptsQuery.isError ? (
        <div className="rounded-2xl border border-border/80 bg-surface/60 px-6 py-12 text-center text-sm text-muted">
          加载失败，
          <button
            type="button"
            onClick={() => void promptsQuery.refetch()}
            className="ml-1 text-accent"
          >
            重试
          </button>
        </div>
      ) : promptItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-muted">该状态下暂无内容。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promptItems.map((prompt) => {
            const cover = mediaUrl(prompt.cover_url);
            const busy = reviewMutation.isPending;
            return (
              <article
                key={prompt.id}
                className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/60 p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {cover && prompt.cover_media_type === "image" ? (
                    <Image
                      src={cover}
                      alt={prompt.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : cover ? (
                    <video
                      src={cover}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted">
                      无预览
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className="rounded-md border border-border/70 px-1.5 py-0.5">
                      {TYPE_LABELS[prompt.type]}
                    </span>
                    <span>{prompt.author.username}</span>
                    <span>·</span>
                    <span>{prompt.created_at.slice(0, 10)}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 ${
                        prompt.status === "pending"
                          ? "bg-amber-400/10 text-amber-200"
                          : prompt.status === "published"
                            ? "bg-mint/10 text-mint"
                            : "bg-red-400/10 text-red-200"
                      }`}
                    >
                      {STATUS_LABELS[prompt.status]}
                    </span>
                  </div>
                  <h2 className="mt-1.5 truncate text-sm font-medium">
                    {prompt.title}
                  </h2>
                  {prompt.description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {prompt.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                    <Link
                      href={`/prompts/${prompt.slug}`}
                      className="inline-flex items-center gap-1 transition hover:text-accent"
                    >
                      查看详情
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {prompt.tags.length > 0 ? (
                      <span className="truncate">
                        {prompt.tags
                          .map((tag) => `#${tag.name}`)
                          .join(" ")}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                  {prompt.status !== "published" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: prompt.id,
                          action: "approve",
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-mint/15 px-3 py-2 text-xs font-medium text-mint transition hover:bg-mint/25 disabled:opacity-50"
                    >
                      {reviewMutation.isPending &&
                      reviewMutation.variables?.id === prompt.id &&
                      reviewMutation.variables.action === "approve" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      通过
                    </button>
                  ) : null}
                  {prompt.status !== "rejected" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRejectingId(prompt.id);
                        setRejectReason("");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      驳回
                    </button>
                  ) : null}
                </div>

                {rejectingId === prompt.id ? (
                  <div className="w-full rounded-xl border border-red-400/20 bg-red-400/5 p-3 sm:w-64">
                    <input
                      value={rejectReason}
                      onChange={(event) =>
                        setRejectReason(event.target.value)
                      }
                      placeholder="填写驳回原因"
                      maxLength={500}
                      className="h-9 w-full rounded-lg border border-border/80 bg-background/60 px-2.5 text-xs outline-none focus:border-red-300/50"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !rejectReason.trim()}
                        onClick={() =>
                          reviewMutation.mutate({
                            id: prompt.id,
                            action: "reject",
                            reason: rejectReason.trim(),
                          })
                        }
                        className="flex-1 rounded-lg bg-red-400/20 px-2 py-1.5 text-xs text-red-100 transition hover:bg-red-400/30 disabled:opacity-50"
                      >
                        确认驳回
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {reviewMutation.isError ? (
        <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {reviewMutation.error.message}
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent
          ? "border-amber-400/25 bg-amber-400/5"
          : "border-border/80 bg-surface/60"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
