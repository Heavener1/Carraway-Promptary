"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

import { localizedPath } from "@/lib/i18n/paths";

import { useI18n } from "./i18n-provider";

type LinkProps = ComponentProps<typeof NextLink>;

export function LocalizedLink({ href, ...props }: LinkProps) {
  const { locale } = useI18n();
  const localizedHref =
    typeof href === "string" ? localizedPath(locale, href) : href;

  return <NextLink href={localizedHref} {...props} />;
}
