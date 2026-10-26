"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  FileText,
  KeyRound,
  Loader2,
  Newspaper,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { LocalizedLink } from "@/components/locale-link";
import { clientFetch } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { interpolate } from "@/lib/i18n";
import { formatDateTime } from "@/lib/i18n/format";
import type {
  AssistantSettings,
  AssistantSettingsInput,
} from "@/lib/types";

interface FormState {
  enabled: boolean;
  apiUrl: string;
  model: string;
  systemPrompt: string;
  apiKey: string;
  clearKey: boolean;
}

export function AdminAssistant() {
  const { dict, locale } = useI18n();
  const { data: me, isLoading } = useMe();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isAdmin = me?.role === "admin";

  const settingsQuery = useQuery<AssistantSettings>({
    queryKey: ["admin-assistant-settings"],
    queryFn: () =>
      clientFetch<AssistantSettings>("/api/v1/admin/assistant/settings"),
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: AssistantSettingsInput) =>
      clientFetch<AssistantSettings>("/api/v1/admin/assistant/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-assistant-settings"], data);
      void queryClient.invalidateQueries({ queryKey: ["assistant-status"] });
      setForm({
        enabled: data.enabled,
        apiUrl: data.api_url ?? "",
        model: data.model ?? "",
        systemPrompt: data.system_prompt ?? "",
        apiKey: "",
        clearKey: false,
      });
      setValidationError(null);
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!settingsQuery.data || form) return;
    setForm({
      enabled: settingsQuery.data.enabled,
      apiUrl: settingsQuery.data.api_url ?? "",
      model: settingsQuery.data.model ?? "",
      systemPrompt: settingsQuery.data.system_prompt ?? "",
      apiKey: "",
      clearKey: false,
    });
  }, [settingsQuery.data, form]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
    setValidationError(null);
  }

  function submit() {
    if (!form) return;
    const apiUrl = form.apiUrl.trim();
    const model = form.model.trim();
    if (form.enabled && (!apiUrl || !model)) {
      setValidationError(dict.adminAssistant.errorEnabled);
      return;
    }

    const payload: AssistantSettingsInput = {
      enabled: form.enabled,
      api_url: apiUrl || null,
      model: model || null,
      system_prompt: form.systemPrompt.trim() || null,
    };
    if (form.apiKey.trim()) payload.api_key = form.apiKey.trim();
    if (form.clearKey) payload.clear_api_key = true;
    saveMutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface/60" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">{dict.admin.loginRequired}</p>
        <LocalizedLink
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          {dict.admin.login}
        </LocalizedLink>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/60 p-8 text-center">
        <p className="text-sm text-muted">{dict.admin.noPermission}</p>
        <LocalizedLink
          href="/"
          className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent/40"
        >
          {dict.admin.backHome}
        </LocalizedLink>
      </div>
    );
  }

  const settings = settingsQuery.data;
  const statusLabel = !settings?.configured
    ? dict.adminAssistant.statusIncomplete
    : settings.enabled
      ? dict.adminAssistant.statusReady
      : dict.adminAssistant.statusDisabled;
  const statusTone = !settings?.configured
    ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
    : settings.enabled
      ? "border-mint/30 bg-mint/10 text-mint"
      : "border-border/70 bg-surface-2 text-muted";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bot className="h-5 w-5 text-accent" />
            {dict.adminAssistant.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {dict.adminAssistant.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <LocalizedLink
            href="/admin"
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
          >
            <FileText className="h-4 w-4" />
            {dict.adminAssistant.promptReview}
          </LocalizedLink>
          <LocalizedLink
            href="/admin/news"
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
          >
            <Newspaper className="h-4 w-4" />
            {dict.adminAssistant.newsManager}
          </LocalizedLink>
          <LocalizedLink
            href="/"
            className="text-muted transition hover:text-accent"
          >
            {dict.adminAssistant.frontSite}
          </LocalizedLink>
        </div>
      </div>

      {settingsQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/60 px-5 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {dict.adminAssistant.loading}
        </div>
      ) : settingsQuery.isError ? (
        <div className="rounded-2xl border border-border/80 bg-surface/60 px-6 py-12 text-center text-sm text-muted">
          {dict.adminAssistant.loadFailed}
          <button
            type="button"
            onClick={() => void settingsQuery.refetch()}
            className="ml-1 text-accent"
          >
            {dict.common.retry}
          </button>
        </div>
      ) : !form ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/60 px-5 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {dict.adminAssistant.loading}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusTone}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
            {settings?.updated_at ? (
              <span className="text-xs text-muted">
                {interpolate(dict.adminAssistant.updatedAt, {
                  date: formatDateTime(settings.updated_at, locale),
                })}
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-5 rounded-2xl border border-border/80 bg-surface/60 p-5 sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-4">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) =>
                    updateForm({ enabled: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border bg-surface-2 accent-[#6d7cff]"
                />
                <span>
                  <span className="block text-sm font-medium">
                    {dict.adminAssistant.enableLabel}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {dict.adminAssistant.enableHint}
                  </span>
                </span>
              </label>

              <div className="space-y-4">
                <h2 className="text-sm font-semibold">
                  {dict.adminAssistant.apiSection}
                </h2>

                <div className="space-y-2">
                  <label
                    htmlFor="assistant-api-url"
                    className="block text-xs font-medium text-muted"
                  >
                    {dict.adminAssistant.apiUrlLabel}
                  </label>
                  <input
                    id="assistant-api-url"
                    type="url"
                    value={form.apiUrl}
                    onChange={(event) =>
                      updateForm({ apiUrl: event.target.value })
                    }
                    placeholder={dict.adminAssistant.apiUrlPlaceholder}
                    className="w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 font-mono text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/60"
                  />
                  <p className="text-[11px] leading-5 text-muted">
                    {dict.adminAssistant.apiUrlHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="assistant-api-key"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {dict.adminAssistant.apiKeyLabel}
                  </label>
                  <input
                    id="assistant-api-key"
                    type="password"
                    autoComplete="new-password"
                    value={form.apiKey}
                    onChange={(event) =>
                      updateForm({
                        apiKey: event.target.value,
                        clearKey: event.target.value ? false : form.clearKey,
                      })
                    }
                    placeholder={dict.adminAssistant.apiKeyPlaceholder}
                    className="w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 font-mono text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/60"
                  />
                  <p className="text-[11px] leading-5 text-muted">
                    {settings?.has_api_key && settings.api_key_masked
                      ? interpolate(dict.adminAssistant.apiKeyStored, {
                          masked: settings.api_key_masked,
                        })
                      : dict.adminAssistant.apiKeyMissing}
                  </p>
                  <p className="text-[11px] leading-5 text-muted">
                    {dict.adminAssistant.apiKeyHint}
                  </p>
                  {settings?.has_api_key ? (
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-red-300">
                      <input
                        type="checkbox"
                        checked={form.clearKey}
                        onChange={(event) =>
                          updateForm({
                            clearKey: event.target.checked,
                            apiKey: event.target.checked ? "" : form.apiKey,
                          })
                        }
                        className="h-3.5 w-3.5 rounded border-border bg-surface-2 accent-red-400"
                      />
                      {dict.adminAssistant.clearKey}
                    </label>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="assistant-model"
                    className="block text-xs font-medium text-muted"
                  >
                    {dict.adminAssistant.modelLabel}
                  </label>
                  <input
                    id="assistant-model"
                    type="text"
                    value={form.model}
                    onChange={(event) =>
                      updateForm({ model: event.target.value })
                    }
                    placeholder={dict.adminAssistant.modelPlaceholder}
                    className="w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 font-mono text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="assistant-system-prompt"
                  className="block text-xs font-medium text-muted"
                >
                  {dict.adminAssistant.systemPromptLabel}
                </label>
                <textarea
                  id="assistant-system-prompt"
                  value={form.systemPrompt}
                  onChange={(event) =>
                    updateForm({ systemPrompt: event.target.value })
                  }
                  rows={5}
                  maxLength={4000}
                  placeholder={dict.adminAssistant.systemPromptPlaceholder}
                  className="w-full resize-y rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-muted/50 focus:border-accent/60"
                />
                <p className="text-[11px] leading-5 text-muted">
                  {dict.adminAssistant.systemPromptHint}
                </p>
              </div>

              {validationError ? (
                <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
                  {validationError}
                </p>
              ) : null}
              {saveMutation.isError ? (
                <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : dict.adminAssistant.saveFailed}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-strong to-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saveMutation.isPending
                    ? dict.adminAssistant.saving
                    : dict.adminAssistant.save}
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-mint">
                    <CheckCircle2 className="h-4 w-4" />
                    {dict.adminAssistant.saved}
                  </span>
                ) : null}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border/80 bg-surface/60 p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-accent" />
                  {dict.assistant.title}
                </div>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {dict.adminAssistant.knowledgeHint}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-surface-2/70 px-2 py-3">
                    <p className="text-lg font-semibold">
                      {dict.common.prompt}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">Prompt</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/70 px-2 py-3">
                    <p className="text-lg font-semibold">{dict.nav.news}</p>
                    <p className="mt-0.5 text-[10px] text-muted">News</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-mint/20 bg-mint/5 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-mint">
                  <ShieldCheck className="h-4 w-4" />
                  {dict.adminAssistant.apiKeyLabel}
                </div>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {dict.adminAssistant.securityNote}
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
