import type { Metadata } from "next";

import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "我的收藏",
  description: "查看收藏的 AI 创作提示词。",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 py-4 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          我的收藏
        </h1>
        <p className="mt-2 text-sm text-muted">
          把值得复用的提示词收在一起。
        </p>
      </div>
      <FavoritesView />
    </div>
  );
}
