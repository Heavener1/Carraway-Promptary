"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, LogOut, Plus, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api";
import { useMe } from "@/lib/hooks";

const links = [
  { href: "/", label: "发现" },
  { href: "/news", label: "AI 资讯" },
  { href: "/forum", label: "论坛" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();

  async function logout() {
    try {
      await clientFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors: clear local auth state below anyway.
    }
    queryClient.setQueryData(["me"], null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-strong to-mint text-background shadow-lg shadow-accent/20">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Promptary</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-2" />
          ) : me ? (
            <>
              <Link
                href="/publish"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-strong to-accent px-3 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">发布</span>
              </Link>
              <Link
                href="/favorites"
                title="我的收藏"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-2 text-sm text-muted transition hover:border-amber-300/40 hover:text-amber-200"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden xl:inline">收藏</span>
              </Link>
              {me.role === "admin" ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">审核</span>
                </Link>
              ) : null}
              <span className="hidden max-w-28 truncate text-sm text-muted lg:inline">
                {me.username}
              </span>
              <button
                type="button"
                onClick={logout}
                title="退出登录"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-foreground"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-border/80 bg-surface-2/60 px-3 py-2 text-sm font-medium transition hover:border-accent/40 hover:text-accent"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
