"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { clientFetch } from "@/lib/api";
import type {
  AssistantChatResponse,
  AssistantSource,
  AssistantStatus,
} from "@/lib/types";

import { useI18n } from "./i18n-provider";
import { LocalizedLink } from "./locale-link";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
}

export function AssistantWidget() {
  const { dict, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const requestSequence = useRef(0);
  const pendingRef = useRef(false);

  const statusQuery = useQuery<AssistantStatus>({
    queryKey: ["assistant-status"],
    queryFn: () =>
      clientFetch<AssistantStatus>("/api/v1/assistant/status"),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 0,
  });

  const enabled = Boolean(statusQuery.data?.enabled);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages, pending, error]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!enabled) return null;

  async function requestAnswer(question: string, appendUser: boolean) {
    const trimmed = question.trim();
    if (!trimmed || pendingRef.current) return;

    const priorMessages = appendUser ? messages : messages.slice(0, -1);
    const history = priorMessages.slice(-6).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
    const sequence = ++requestSequence.current;

    if (appendUser) {
      setMessages((current) => [
        ...current,
        { role: "user", content: trimmed },
      ]);
    }
    setInput("");
    setError(null);
    setPending(true);
    pendingRef.current = true;
    setLastQuestion(trimmed);

    try {
      const data = await clientFetch<AssistantChatResponse>(
        "/api/v1/assistant/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            locale,
            history,
          }),
        },
      );
      if (sequence !== requestSequence.current) return;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || dict.assistant.emptyAnswer,
          sources: data.sources,
        },
      ]);
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : dict.assistant.failed,
      );
    } finally {
      if (sequence === requestSequence.current) {
        setPending(false);
        pendingRef.current = false;
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void requestAnswer(input, true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void requestAnswer(input, true);
    }
  }

  function startNewChat() {
    requestSequence.current += 1;
    pendingRef.current = false;
    setMessages([]);
    setInput("");
    setError(null);
    setLastQuestion(null);
    setPending(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          role="dialog"
          aria-label={dict.assistant.title}
          className="flex h-[min(72vh,620px)] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-strong to-mint text-background">
              <Sparkles className="h-4 w-4" strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">
                {dict.assistant.title}
              </h2>
              <p className="truncate text-[11px] text-muted">
                {dict.assistant.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              title={dict.assistant.newChat}
              aria-label={dict.assistant.newChat}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title={dict.assistant.close}
              aria-label={dict.assistant.close}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Bot className="h-6 w-6" />
                </div>
                <p className="mx-auto mt-4 max-w-[280px] text-center text-sm leading-6 text-muted">
                  {dict.assistant.welcome}
                </p>
                <div className="mt-5 space-y-2">
                  {dict.assistant.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void requestAnswer(suggestion, true)}
                      className="w-full rounded-xl border border-border/70 bg-surface-2/50 px-3 py-2.5 text-left text-xs leading-5 text-muted transition hover:border-accent/40 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((entry, index) =>
              entry.role === "user" ? (
                <div key={`user-${index}`} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-strong px-3.5 py-2.5 text-sm leading-6 text-white">
                    <p className="whitespace-pre-wrap break-words">
                      {entry.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={`assistant-${index}`} className="space-y-2">
                  <div className="flex max-w-[92%] items-start gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 rounded-2xl rounded-tl-md border border-border/60 bg-surface-2/60 px-3.5 py-2.5 text-sm leading-6">
                      <p className="whitespace-pre-wrap break-words">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                  {entry.sources && entry.sources.length > 0 ? (
                    <div className="ml-9 space-y-1.5">
                      <p className="text-[11px] font-medium text-muted">
                        {dict.assistant.sources}
                      </p>
                      {entry.sources.map((source) => (
                        <LocalizedLink
                          key={`${source.kind}-${source.path}`}
                          href={source.path}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-foreground"
                        >
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent/10 text-[10px] font-semibold text-accent">
                            {source.index}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {source.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted/80">
                            {source.kind === "prompt"
                              ? dict.assistant.promptSource
                              : dict.news.page.badge}
                          </span>
                        </LocalizedLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )}

            {pending ? (
              <div className="flex items-center gap-2.5 text-xs text-muted">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </span>
                <span>{dict.assistant.thinking}</span>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-xs leading-5 text-red-200">
                <p>{error}</p>
                {lastQuestion ? (
                  <button
                    type="button"
                    onClick={() => void requestAnswer(lastQuestion, false)}
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-red-100 underline-offset-2 hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {dict.assistant.retry}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <footer className="border-t border-border/70 px-3 pb-3 pt-3">
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={1000}
                placeholder={dict.assistant.placeholder}
                aria-label={dict.assistant.placeholder}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 text-sm leading-5 outline-none transition placeholder:text-muted/70 focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                aria-label={dict.assistant.send}
                title={dict.assistant.send}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-strong to-accent text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] leading-4 text-muted/70">
              {dict.assistant.disclaimer}
            </p>
          </footer>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? dict.assistant.close : dict.assistant.open}
        title={open ? dict.assistant.close : dict.assistant.open}
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent-strong to-mint text-background shadow-xl shadow-accent/25 transition hover:scale-[1.03] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}
