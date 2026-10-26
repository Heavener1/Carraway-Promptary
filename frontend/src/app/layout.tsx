import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Promptary · AI 提示词社区",
    template: "%s · Promptary",
  },
  description:
    "发现、分享与收藏高质量的文生图、图生图、文生视频、图生视频提示词，交流 AI 创作经验。",
  keywords: [
    "AI 提示词",
    "Prompt",
    "文生图",
    "图生图",
    "文生视频",
    "图生视频",
    "Midjourney",
    "Flux",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Promptary",
    title: "Promptary · AI 提示词社区",
    description: "发现和分享高质量的 AI 创作提示词。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Promptary · AI 提示词社区",
    description: "发现和分享高质量的 AI 创作提示词。",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
            Promptary · 让好提示词被复用与进化
          </footer>
        </Providers>
      </body>
    </html>
  );
}
