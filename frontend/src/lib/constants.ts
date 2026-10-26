import type { PromptType } from "./types";

export const PROMPT_TYPE_VALUES: PromptType[] = [
  "text_to_image",
  "image_to_image",
  "text_to_video",
  "image_to_video",
];

export const SORT_VALUES = ["latest", "popular", "views"] as const;

export type SortValue = (typeof SORT_VALUES)[number];

export const CATEGORIES = [
  "摄影",
  "插画",
  "3D",
  "设计",
  "电影",
  "动漫",
  "建筑",
  "其他",
];

export const MODEL_SUGGESTIONS = [
  "Midjourney",
  "Stable Diffusion",
  "Flux",
  "DALL·E",
  "Sora",
  "Runway",
  "可灵",
  "即梦",
  "海螺",
];

export const NEWS_CATEGORIES = [
  "模型发布",
  "产品动态",
  "行业观察",
  "教程实践",
  "研究论文",
];

export const NEWS_CATEGORY_COLORS: Record<string, string> = {
  模型发布: "border-accent/30 bg-accent/10 text-accent",
  产品动态: "border-mint/30 bg-mint/10 text-mint",
  行业观察: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  教程实践: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  研究论文: "border-violet-300/30 bg-violet-300/10 text-violet-200",
};
