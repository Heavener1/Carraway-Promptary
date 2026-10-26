import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PromptDetailView } from "@/components/prompt-detail";
import { serverFetch } from "@/lib/server-api";
import type {
  CommentListResponse,
  PromptDetail,
  PromptListResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const getPrompt = cache(async (slug: string) => {
  return serverFetch<PromptDetail>(
    `/api/v1/prompts/${encodeURIComponent(slug)}`,
  );
});

function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const prompt = await getPrompt(slug);
    const image = absoluteMediaUrl(prompt.cover_url);
    const description =
      prompt.description ??
      `${prompt.positive_prompt.slice(0, 150)}${prompt.positive_prompt.length > 150 ? "…" : ""}`;

    return {
      title: prompt.title,
      description,
      openGraph: {
        type: "article",
        title: prompt.title,
        description,
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: prompt.title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: "提示词" };
  }
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let prompt: PromptDetail | null = null;
  try {
    prompt = await getPrompt(slug);
  } catch {
    notFound();
  }
  if (!prompt) notFound();

  const [related, comments] = await Promise.all([
    serverFetch<PromptListResponse>(
      `/api/v1/prompts/${encodeURIComponent(slug)}/related?limit=6`,
    ).catch(() => ({ items: [], next_cursor: null })),
    serverFetch<CommentListResponse>(
      `/api/v1/prompts/${encodeURIComponent(slug)}/comments?limit=100`,
    ).catch(() => ({ items: [], total: 0 })),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: prompt.title,
    description: prompt.description ?? undefined,
    image: absoluteMediaUrl(prompt.cover_url),
    datePublished: prompt.published_at ?? prompt.created_at,
    author: {
      "@type": "Person",
      name: prompt.author.username,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PromptDetailView
        key={prompt.id}
        prompt={prompt}
        related={related.items}
        initialComments={comments}
      />
    </>
  );
}
