import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 Promptary，发布和收藏 AI 创作提示词。",
};

export default function LoginPage() {
  return (
    <div className="py-12 sm:py-20">
      <AuthForm mode="login" />
    </div>
  );
}
