"use client";

import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { clientFetch, mediaUrl } from "@/lib/api";
import {
  CATEGORIES,
  MODEL_SUGGESTIONS,
  PROMPT_TYPES,
} from "@/lib/constants";
import { useMe } from "@/lib/hooks";
import type {
  AssetRole,
  MediaType,
  MediaUploadResponse,
  PromptDetail,
  PromptType,
} from "@/lib/types";

interface AssetDraft {
  id: string;
  url: string;
  media_type: MediaType;
  width: number | null;
  height: number | null;
  role: AssetRole;
  name: string;
}

interface ParamDraft {
  steps: string;
  cfg: string;
  seed: string;
  aspect_ratio: string;
  sampler: string;
}

const EMPTY_PARAMS: ParamDraft = {
  steps: "",
  cfg: "",
  seed: "",
  aspect_ratio: "",
  sampler: "",
};

export function PublishForm() {
  const router = useRouter();
  const { data: me, isLoading } = useMe();

  const [type, setType] = useState<PromptType>("text_to_image");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "unlisted" | "private"
  >("public");
  const [params, setParams] = useState<ParamDraft>(EMPTY_PARAMS);
  const [assets, setAssets] = useState<AssetDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "pending" | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && me === null) {
      router.replace("/login");
    }
  }, [isLoading, me, router]);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const next: AssetDraft[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await clientFetch<MediaUploadResponse>(
          "/api/v1/media/upload",
          { method: "POST", body: formData },
        );

        const needsInput =
          type === "image_to_image" || type === "image_to_video";
        const hasInput =
          assets.some((asset) => asset.role === "input") ||
          next.some((asset) => asset.role === "input");
        const role: AssetRole =
          needsInput && !hasInput && uploaded.media_type === "image"
            ? "input"
            : "output";

        next.push({
          id: crypto.randomUUID(),
          url: uploaded.url,
          media_type: uploaded.media_type,
          width: uploaded.width,
          height: uploaded.height,
          role,
          name: file.name,
        });
      }
      setAssets((previous) => [...previous, ...next]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "上传失败",
      );
    } finally {
      setUploading(false);
    }
  }

  function updateAssetRole(id: string, role: AssetRole) {
    setAssets((previous) =>
      previous.map((asset) => (asset.id === id ? { ...asset, role } : asset)),
    );
  }

  function removeAsset(id: string) {
    setAssets((previous) => previous.filter((asset) => asset.id !== id));
  }

  async function submit(status: "draft" | "pending") {
    setError("");

    if (title.trim().length < 2) {
      setError("标题至少需要 2 个字符");
      return;
    }
    if (!positivePrompt.trim()) {
      setError("请填写正向提示词");
      return;
    }
    if (status === "pending") {
      const assetError = validateAssets(type, assets);
      if (assetError) {
        setError(assetError);
        return;
      }
    }

    setSubmitting(status);
    const paramsPayload: Record<string, unknown> = {};
    if (params.steps) paramsPayload.steps = Number(params.steps);
    if (params.cfg) paramsPayload.cfg = Number(params.cfg);
    if (params.seed) paramsPayload.seed = Number(params.seed);
    if (params.aspect_ratio) paramsPayload.aspect_ratio = params.aspect_ratio;
    if (params.sampler) paramsPayload.sampler = params.sampler;

    try {
      const created = await clientFetch<PromptDetail>("/api/v1/prompts", {
        method: "POST",
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || null,
          positive_prompt: positivePrompt.trim(),
          negative_prompt: negativePrompt.trim() || null,
          model: model.trim() || null,
          params: paramsPayload,
          category: category || null,
          tags: tags
            .split(/[,，]/)
            .map((item) => item.trim())
            .filter(Boolean),
          assets: assets.map((asset, index) => ({
            url: asset.url,
            role: asset.role,
            media_type: asset.media_type,
            width: asset.width,
            height: asset.height,
            sort_order: index,
          })),
          status,
          visibility,
        }),
      });
      router.push(`/prompts/${created.slug}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "提交失败",
      );
    } finally {
      setSubmitting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface/60" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">请先登录后再发布提示词。</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void submit("pending");
      }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">分享提示词</h1>
        <p className="mt-1.5 text-sm text-muted">
          完整记录提示词、模型与参数，让其他人也能复现同样的效果。
        </p>
      </div>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="01" title="创作类型" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PROMPT_TYPES.map((option) => {
            const active = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent/60 bg-accent/10"
                    : "border-border/70 bg-background/30 hover:border-accent/30"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span
                    className={`text-[10px] ${active ? "text-accent" : "text-muted/60"}`}
                  >
                    {option.short}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="02" title="基本信息" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel required>标题</FieldLabel>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="简洁描述画面，例如：赛博朋克雨夜城市"
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <FieldLabel>简介</FieldLabel>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="创作思路、适用场景或使用建议（可选）"
              className={`${inputClass} h-auto py-2.5`}
            />
          </label>

          <label>
            <FieldLabel>模型</FieldLabel>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              list="model-suggestions"
              placeholder="例如 Flux / Midjourney"
              className={inputClass}
            />
            <datalist id="model-suggestions">
              {MODEL_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label>
            <FieldLabel>分类</FieldLabel>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              <option value="">不分类</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="03" title="提示词内容" />
        <div className="mt-4 space-y-4">
          <label className="block">
            <FieldLabel required>正向提示词</FieldLabel>
            <textarea
              value={positivePrompt}
              onChange={(event) => setPositivePrompt(event.target.value)}
              rows={6}
              maxLength={20000}
              placeholder="描述你希望生成的画面、风格、光线、构图…"
              className={`${inputClass} h-auto py-3 font-mono text-[13px] leading-6`}
            />
          </label>
          <label className="block">
            <FieldLabel>负向提示词</FieldLabel>
            <textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              rows={3}
              maxLength={20000}
              placeholder="不希望出现的内容，例如 blurry, low quality（可选）"
              className={`${inputClass} h-auto py-3 font-mono text-[13px] leading-6`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="04" title="生成参数" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ParamField
            label="步数"
            value={params.steps}
            placeholder="28"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, steps: value }))
            }
          />
          <ParamField
            label="引导系数 CFG"
            value={params.cfg}
            placeholder="3.5"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, cfg: value }))
            }
          />
          <ParamField
            label="种子 Seed"
            value={params.seed}
            placeholder="12345"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, seed: value }))
            }
          />
          <ParamField
            label="宽高比"
            value={params.aspect_ratio}
            placeholder="16:9"
            onChange={(value) =>
              setParams((previous) => ({
                ...previous,
                aspect_ratio: value,
              }))
            }
          />
          <ParamField
            label="采样器"
            value={params.sampler}
            placeholder="DPM++ 2M"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, sampler: value }))
            }
          />
        </div>
        <p className="mt-3 text-[11px] text-muted">
          只填写你实际使用的参数，留空的项不会展示。
        </p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="05" title="作品素材" />
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void uploadFiles(event.dataTransfer.files);
          }}
          className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/90 bg-background/30 px-6 py-10 text-center transition hover:border-accent/50 hover:bg-accent/5"
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(event) => {
              void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          ) : (
            <UploadCloud className="h-7 w-7 text-accent" />
          )}
          <span className="mt-3 text-sm font-medium">
            {uploading ? "正在上传…" : "点击或拖拽上传图片 / 视频"}
          </span>
          <span className="mt-1 text-[11px] text-muted">
            支持 JPG、PNG、WebP、GIF、MP4、WebM、MOV
          </span>
        </label>

        {assets.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex gap-3 rounded-xl border border-border/70 bg-background/40 p-3"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {asset.media_type === "video" ? (
                    <video
                      src={mediaUrl(asset.url) ?? undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(asset.url) ?? ""}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{asset.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={asset.role}
                      onChange={(event) =>
                        updateAssetRole(
                          asset.id,
                          event.target.value as AssetRole,
                        )
                      }
                      className="h-8 rounded-lg border border-border/80 bg-surface px-2 text-xs outline-none"
                    >
                      <option value="output">生成结果</option>
                      <option value="input">参考图</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-400/10 hover:text-red-300"
                      aria-label="删除素材"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-[11px] text-muted">
          图生图 / 图生视频请至少上传一张参考图，并保留生成结果。
        </p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="06" title="标签与可见性" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>标签</FieldLabel>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="用逗号分隔，例如：赛博朋克, 霓虹, 电影感"
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-muted">
              最多 10 个标签
            </span>
          </label>
          <label>
            <FieldLabel>可见性</FieldLabel>
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(
                  event.target.value as "public" | "unlisted" | "private",
                )
              }
              className={inputClass}
            >
              <option value="public">公开 · 出现在发现页</option>
              <option value="unlisted">仅链接可见</option>
              <option value="private">私密 · 仅自己可见</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          提交后进入人工审核，通过后才会公开展示。
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void submit("draft")}
            disabled={submitting !== null || uploading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/80 px-4 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-60 sm:flex-none"
          >
            {submitting === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            保存草稿
          </button>
          <button
            type="submit"
            disabled={submitting !== null || uploading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-strong to-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-60 sm:flex-none"
          >
            {submitting === "pending" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            提交审核
          </button>
        </div>
      </div>
    </form>
  );
}

function validateAssets(
  type: PromptType,
  assets: AssetDraft[],
): string | null {
  const inputs = assets.filter((asset) => asset.role === "input");
  const outputs = assets.filter((asset) => asset.role === "output");
  const hasInputImage = inputs.some((asset) => asset.media_type === "image");
  const hasOutputImage = outputs.some((asset) => asset.media_type === "image");
  const hasOutputVideo = outputs.some((asset) => asset.media_type === "video");

  if (type === "text_to_image" && !hasOutputImage) {
    return "文生图至少需要上传一张生成结果图片";
  }
  if (type === "image_to_image") {
    if (!hasInputImage) return "图生图需要至少一张参考图";
    if (!hasOutputImage) return "图生图至少需要上传一张生成结果图片";
  }
  if (type === "text_to_video" && !hasOutputVideo) {
    return "文生视频需要至少上传一个生成结果视频";
  }
  if (type === "image_to_video") {
    if (!hasInputImage) return "图生视频需要至少一张参考图";
    if (!hasOutputVideo) return "图生视频需要至少上传一个生成结果视频";
  }
  return null;
}

const inputClass =
  "h-11 w-full rounded-xl border border-border/80 bg-background/60 px-3.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

function SectionTitle({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[11px] text-accent/70">{step}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-muted">
      {children}
      {required ? <span className="ml-1 text-red-300">*</span> : null}
    </span>
  );
}

function ParamField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}
