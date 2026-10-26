"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, LogOut, Plus, Shield, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { localizedPath, stripLocaleFromPath } from "@/lib/i18n/paths";

import { useI18n } from "./i18n-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { LocalizedLink } from "./locale-link";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();
  const { locale, dict } = useI18n();

  const currentPath = stripLocaleFromPath(pathname);
  const links = [
    { href: "/", label: dict.nav.discover },
    { href: "/news", label: dict.nav.news },
    { href: "/forum", label: dict.nav.forum },
  ];

  async function logout() {
    try {
      await clientFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors: clear local auth state below anyway.
    }
    queryClient.setQueryData(["me"], null);
    router.push(localizedPath(locale, "/"));
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <LocalizedLink href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-strong to-mint text-background shadow-lg shadow-accent/20">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Promptary</span>
        </LocalizedLink>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(link.href);
            return (
              <LocalizedLink
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                }`}
              >
                {link.label}
              </LocalizedLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          {isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-2" />
          ) : me ? (
            <>
              <LocalizedLink
                href="/publish"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-strong to-accent px-3 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{dict.nav.publish}</span>
              </LocalizedLink>
              <LocalizedLink
                href="/favorites"
                title={dict.nav.favorites}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-2 text-sm text-muted transition hover:border-amber-300/40 hover:text-amber-200"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden xl:inline">{dict.nav.favorites}</span>
              </LocalizedLink>
              {me.role === "admin" ? (
                <LocalizedLink
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-foreground"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">{dict.nav.admin}</span>
                </LocalizedLink>
              ) : null}
              <span className="hidden max-w-28 truncate text-sm text-muted lg:inline">
                {me.username}
              </span>
              <button
                type="button"
                onClick={logout}
                title={dict.nav.logout}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <LocalizedLink
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm text-muted transition hover:text-foreground sm:block"
              >
                {dict.nav.login}
              </LocalizedLink>
              <LocalizedLink
                href="/register"
                className="rounded-lg border border-border/80 bg-surface-2/60 px-3 py-2 text-sm font-medium transition hover:border-accent/40 hover:text-accent"
              >
                {dict.nav.register}
              </LocalizedLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
