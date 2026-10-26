import type { Metadata } from "next";
import { Newspaper, Sparkles } from "lucide-react";

import { NewsFeed } from "@/components/news-feed";
import { serverFetch } from "@/lib/server-api";
import type { NewsListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 资讯",
  description:
    "追踪 AI 图像与视频生成领域的最新动态：模型发布、产品更新、行业观察、教程实践与研究论文。",
  keywords: ["AI 资讯", "文生图", "文生视频", "模型发布", "AI 工具"],
  openGraph: {
    type: "website",
    title: "AI 资讯 · Promptary",
    description:
      "模型发布、产品动态、行业观察、教程实践与研究论文，一页看完 AI 创作领域的新变化。",
  },
};

export default async function NewsPage() {
  const initialData = await serverFetch<NewsListResponse>(
    "/api/v1/news?limit=12",
  ).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/50 px-6 py-10 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            AI 资讯
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            跟上生成式 AI 的每一次更新
          </h1>
          <p className="mt-3 text-pretty text-sm leading-7 text-muted">
            模型发布、产品动态、行业观察、教程实践与研究论文。由编辑筛选整理，
            把值得关注的信息放进你的创作视野。
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted">
            <Newspaper className="h-4 w-4 text-accent/70" />
            共 {initialData.total} 篇资讯
          </div>
        </div>
      </section>

      <NewsFeed initialData={initialData} />
    </div>
  );
}
