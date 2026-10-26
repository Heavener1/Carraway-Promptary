"use client";

import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { clientFetch, mediaUrl } from "@/lib/api";
import {
  CATEGORIES,
  MODEL_SUGGESTIONS,
  PROMPT_TYPE_VALUES,
} from "@/lib/constants";
import { useMe } from "@/lib/hooks";
import type { Dictionary } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n/paths";
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
  const { dict, locale } = useI18n();
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
      router.replace(localizedPath(locale, "/login"));
    }
  }, [isLoading, locale, me, router]);

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
        uploadError instanceof Error
          ? uploadError.message
          : dict.publish.errorUpload,
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
      setError(dict.publish.errorTitle);
      return;
    }
    if (!positivePrompt.trim()) {
      setError(dict.publish.errorPositivePrompt);
      return;
    }
    if (status === "pending") {
      const assetError = validateAssets(
        type,
        assets,
        dict.publish.assetErrors,
      );
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
      router.push(localizedPath(locale, `/prompts/${created.slug}`));
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : dict.publish.errorSubmit,
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
        <p className="text-sm text-muted">{dict.publish.loginRequired}</p>
        <LocalizedLink
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          {dict.publish.login}
        </LocalizedLink>
      </div>
    );
  }

  const categoryLabels = dict.categories as Record<string, string>;

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void submit("pending");
      }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {dict.publish.title}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{dict.publish.subtitle}</p>
      </div>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="01" title={dict.publish.sectionType} />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PROMPT_TYPE_VALUES.map((option) => {
            const active = type === option;
            const labels = dict.promptTypes[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent/60 bg-accent/10"
                    : "border-border/70 bg-background/30 hover:border-accent/30"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{labels.label}</span>
                  <span
                    className={`text-[10px] ${active ? "text-accent" : "text-muted/60"}`}
                  >
                    {labels.short}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  {labels.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="02" title={dict.publish.sectionBasic} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel required>{dict.publish.titleLabel}</FieldLabel>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder={dict.publish.titlePlaceholder}
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <FieldLabel>{dict.publish.descriptionLabel}</FieldLabel>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={dict.publish.descriptionPlaceholder}
              className={`${inputClass} h-auto py-2.5`}
            />
          </label>

          <label>
            <FieldLabel>{dict.publish.modelLabel}</FieldLabel>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              list="model-suggestions"
              placeholder={dict.publish.modelPlaceholder}
              className={inputClass}
            />
            <datalist id="model-suggestions">
              {MODEL_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label>
            <FieldLabel>{dict.publish.categoryLabel}</FieldLabel>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              <option value="">{dict.publish.noCategory}</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item] ?? item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="03" title={dict.publish.sectionPrompt} />
        <div className="mt-4 space-y-4">
          <label className="block">
            <FieldLabel required>{dict.publish.positivePrompt}</FieldLabel>
            <textarea
              value={positivePrompt}
              onChange={(event) => setPositivePrompt(event.target.value)}
              rows={6}
              maxLength={20000}
              placeholder={dict.publish.positivePromptPlaceholder}
              className={`${inputClass} h-auto py-3 font-mono text-[13px] leading-6`}
            />
          </label>
          <label className="block">
            <FieldLabel>{dict.publish.negativePrompt}</FieldLabel>
            <textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              rows={3}
              maxLength={20000}
              placeholder={dict.publish.negativePromptPlaceholder}
              className={`${inputClass} h-auto py-3 font-mono text-[13px] leading-6`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="04" title={dict.publish.sectionParams} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ParamField
            label={dict.params.steps}
            value={params.steps}
            placeholder="28"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, steps: value }))
            }
          />
          <ParamField
            label={dict.params.cfg}
            value={params.cfg}
            placeholder="3.5"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, cfg: value }))
            }
          />
          <ParamField
            label={dict.params.seed}
            value={params.seed}
            placeholder="12345"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, seed: value }))
            }
          />
          <ParamField
            label={dict.params.aspect_ratio}
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
            label={dict.params.sampler}
            value={params.sampler}
            placeholder="DPM++ 2M"
            onChange={(value) =>
              setParams((previous) => ({ ...previous, sampler: value }))
            }
          />
        </div>
        <p className="mt-3 text-[11px] text-muted">{dict.publish.paramsHint}</p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="05" title={dict.publish.sectionAssets} />
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
            {uploading ? dict.publish.uploading : dict.publish.uploadIdle}
          </span>
          <span className="mt-1 text-[11px] text-muted">
            {dict.publish.uploadHint}
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
                      <option value="output">{dict.publish.roleOutput}</option>
                      <option value="input">{dict.publish.roleInput}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-400/10 hover:text-red-300"
                      aria-label={dict.publish.deleteAsset}
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
          {dict.publish.assetsHint}
        </p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
        <SectionTitle step="06" title={dict.publish.sectionMeta} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>{dict.publish.tagsLabel}</FieldLabel>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={dict.publish.tagsPlaceholder}
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-muted">
              {dict.publish.tagsHint}
            </span>
          </label>
          <label>
            <FieldLabel>{dict.publish.visibilityLabel}</FieldLabel>
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(
                  event.target.value as "public" | "unlisted" | "private",
                )
              }
              className={inputClass}
            >
              <option value="public">{dict.publish.visibilityPublic}</option>
              <option value="unlisted">
                {dict.publish.visibilityUnlisted}
              </option>
              <option value="private">{dict.publish.visibilityPrivate}</option>
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
        <p className="text-xs text-muted">{dict.publish.submitHint}</p>
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
            {dict.publish.saveDraft}
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
            {dict.publish.submitReview}
          </button>
        </div>
      </div>
    </form>
  );
}

function validateAssets(
  type: PromptType,
  assets: AssetDraft[],
  messages: Dictionary["publish"]["assetErrors"],
): string | null {
  const inputs = assets.filter((asset) => asset.role === "input");
  const outputs = assets.filter((asset) => asset.role === "output");
  const hasInputImage = inputs.some((asset) => asset.media_type === "image");
  const hasOutputImage = outputs.some((asset) => asset.media_type === "image");
  const hasOutputVideo = outputs.some((asset) => asset.media_type === "video");

  if (type === "text_to_image" && !hasOutputImage) {
    return messages.textToImageOutput;
  }
  if (type === "image_to_image") {
    if (!hasInputImage) return messages.imageToImageInput;
    if (!hasOutputImage) return messages.imageToImageOutput;
  }
  if (type === "text_to_video" && !hasOutputVideo) {
    return messages.textToVideoOutput;
  }
  if (type === "image_to_video") {
    if (!hasInputImage) return messages.imageToVideoInput;
    if (!hasOutputVideo) return messages.imageToVideoOutput;
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
