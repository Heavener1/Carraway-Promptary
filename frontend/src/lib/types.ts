export type PromptType =
  | "text_to_image"
  | "image_to_image"
  | "text_to_video"
  | "image_to_video";

export type PromptStatus = "draft" | "pending" | "published" | "rejected";

export type MediaType = "image" | "video";

export type AssetRole = "input" | "output";

export interface UserPublic {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface UserMe extends UserPublic {
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

export interface PromptAsset {
  id: string;
  role: AssetRole;
  media_type: MediaType;
  url: string;
  thumb_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  sort_order: number;
}

export interface PromptSummary {
  id: string;
  slug: string;
  type: PromptType;
  title: string;
  description: string | null;
  model: string | null;
  category: string | null;
  cover_url: string | null;
  cover_media_type: MediaType | null;
  author: UserPublic;
  tags: Tag[];
  status: PromptStatus;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export interface PromptDetail extends PromptSummary {
  positive_prompt: string;
  negative_prompt: string | null;
  params: Record<string, unknown>;
  visibility: "public" | "unlisted" | "private";
  reject_reason: string | null;
  updated_at: string;
  assets: PromptAsset[];
  liked: boolean;
  favorited: boolean;
}

export interface PromptListResponse {
  items: PromptSummary[];
  next_cursor: string | null;
}

export interface AdminPromptListResponse {
  items: PromptSummary[];
  total: number;
}

export interface TagListResponse {
  items: Tag[];
}

export interface AuthResponse {
  user: UserMe;
}

export interface MediaUploadResponse {
  url: string;
  media_type: MediaType;
  width: number | null;
  height: number | null;
  size: number;
  original_name: string;
}

export interface PromptTypeOption {
  value: PromptType;
  label: string;
  short: string;
}

export interface MetaOptions {
  types: PromptTypeOption[];
  categories: string[];
  models: string[];
  news_categories: string[];
}

export interface AdminStats {
  total_users: number;
  total_prompts: number;
  draft: number;
  pending: number;
  published: number;
  rejected: number;
}

export interface PromptComment {
  id: string;
  content: string;
  author: UserPublic;
  created_at: string;
  is_mine: boolean;
}

export interface CommentListResponse {
  items: PromptComment[];
  total: number;
}

export interface LikeState {
  liked: boolean;
  like_count: number;
}

export interface FavoriteState {
  favorited: boolean;
  favorite_count: number;
}

export interface FavoriteListResponse {
  items: PromptSummary[];
  total: number;
}

export type NewsStatus = "draft" | "published";

export interface NewsArticleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  category: string;
  source_name: string | null;
  source_url: string | null;
  author: UserPublic;
  status: NewsStatus;
  is_featured: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export interface NewsArticleDetail extends NewsArticleSummary {
  content: string;
  updated_at: string;
}

export interface NewsListResponse {
  items: NewsArticleSummary[];
  total: number;
}

export interface NewsArticleInput {
  title: string;
  summary: string | null;
  content: string;
  cover_url: string | null;
  category: string;
  source_name: string | null;
  source_url: string | null;
  status: NewsStatus;
  is_featured: boolean;
}

export type AssistantSourceKind = "prompt" | "news";

export interface AssistantSource {
  index: number;
  kind: AssistantSourceKind;
  title: string;
  path: string;
  snippet: string | null;
}

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatResponse {
  answer: string;
  sources: AssistantSource[];
}

export interface AssistantStatus {
  enabled: boolean;
  configured: boolean;
}

export interface AssistantSettings {
  enabled: boolean;
  api_url: string | null;
  model: string | null;
  has_api_key: boolean;
  api_key_masked: string | null;
  system_prompt: string | null;
  configured: boolean;
  updated_at: string | null;
}

export interface AssistantSettingsInput {
  enabled: boolean;
  api_url: string | null;
  model: string | null;
  system_prompt: string | null;
  api_key?: string;
  clear_api_key?: boolean;
}
