"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { clientFetch } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      clientFetch<AuthResponse>(
        isLogin ? "/api/v1/auth/login" : "/api/v1/auth/register",
        {
          method: "POST",
          body: JSON.stringify(
            isLogin ? { email, password } : { email, username, password },
          ),
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data.user);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.push(safeNext);
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");

    if (!isLogin && password !== confirmPassword) {
      setLocalError("两次输入的密码不一致");
      return;
    }
    if (!isLogin && username.trim().length < 2) {
      setLocalError("用户名至少需要 2 个字符");
      return;
    }
    mutation.mutate();
  }

  const error = localError || mutation.error?.message;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border/80 bg-surface/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-strong to-mint text-background">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">
              {isLogin ? "欢迎回来" : "加入 Promptary"}
            </h1>
            <p className="text-xs text-muted">
              {isLogin
                ? "登录后即可发布、收藏和交流提示词"
                : "创建账号，开始沉淀你的创作方法"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="邮箱">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>

          {isLogin ? null : (
            <Field label="用户名">
              <input
                type="text"
                required
                autoComplete="username"
                minLength={2}
                maxLength={40}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="展示给社区的名字"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="密码">
            <input
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位字符"
              className={inputClass}
            />
          </Field>

          {isLogin ? null : (
            <Field label="确认密码">
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
                className={inputClass}
              />
            </Field>
          )}

          {error ? (
            <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-strong to-accent text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isLogin ? "登录" : "注册并登录"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          {isLogin ? "还没有账号？" : "已经有账号？"}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="ml-1 text-accent transition hover:underline"
          >
            {isLogin ? "立即注册" : "去登录"}
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-border/80 bg-background/60 px-3.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
