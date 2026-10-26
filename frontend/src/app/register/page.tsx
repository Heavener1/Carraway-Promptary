import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "注册",
  description: "注册 Promptary 账号，分享你的 AI 创作提示词。",
};

export default function RegisterPage() {
  return (
    <div className="py-12 sm:py-20">
      <AuthForm mode="register" />
    </div>
  );
}
