import type { PromptStatus, PromptType } from "./types";

export const PROMPT_TYPES: {
  value: PromptType;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    value: "text_to_image",
    label: "文生图",
    short: "T2I",
    hint: "用文字生成图片",
  },
  {
    value: "image_to_image",
    label: "图生图",
    short: "I2I",
    hint: "参考图 + 文字重绘",
  },
  {
    value: "text_to_video",
    label: "文生视频",
    short: "T2V",
    hint: "用文字生成视频",
  },
  {
    value: "image_to_video",
    label: "图生视频",
    short: "I2V",
    hint: "让图片动起来",
  },
];

export const TYPE_LABELS: Record<PromptType, string> = {
  text_to_image: "文生图",
  image_to_image: "图生图",
  text_to_video: "文生视频",
  image_to_video: "图生视频",
};

export const TYPE_SHORT: Record<PromptType, string> = {
  text_to_image: "T2I",
  image_to_image: "I2I",
  text_to_video: "T2V",
  image_to_video: "I2V",
};

export const SORT_OPTIONS = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "最受欢迎" },
  { value: "views", label: "最多浏览" },
] as const;

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

export const STATUS_LABELS: Record<PromptStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  rejected: "已驳回",
};

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
