"use client";

import { LocalizedLink } from "@/components/locale-link";
import { useI18n } from "@/components/i18n-provider";

export default function NotFound() {
  const { dict } = useI18n();

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-2xl font-semibold">{dict.notFound.title}</h1>
      <p className="mt-2 text-sm text-muted">{dict.notFound.description}</p>
      <LocalizedLink
        href="/"
        className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
      >
        {dict.notFound.home}
      </LocalizedLink>
    </div>
  );
}
