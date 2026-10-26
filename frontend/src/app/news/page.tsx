import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI 资讯",
};

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
        <Newspaper className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">AI 资讯正在建设中</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        这里将聚合模型发布、工具更新与行业动态，并支持编辑精选和社区讨论。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl border border-border px-4 py-2.5 text-sm transition hover:border-accent/40 hover:text-accent"
      >
        先去逛逛提示词
      </Link>
    </div>
  );
}
