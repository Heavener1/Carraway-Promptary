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
