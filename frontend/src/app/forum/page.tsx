import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "论坛",
};

export default function ForumPage() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
        <MessagesSquare className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">论坛正在建设中</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        即将支持发帖、评论、关注与通知，让提示词创作经验真正流动起来。
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
