/** Public blog (/api/blog/*): published articles only, no sign-in. */
import { referralCode } from "../attribution";
import type { GuideCard } from "./guides";
import { authedRequest } from "./http";

export type ArticleType = "press_release" | "tutorial" | "newsletter" | "new_release" | "informative";

export interface ArticleCard {
  slug: string;
  title: string;
  type: ArticleType;
  type_label: string;
  summary: string;
  cover: { id: number; url: string } | null;
  cover_alt: string;
  tags: string[];
  author_name: string;
  reading_minutes: number;
  published_at: string;
}

export interface ArticlePage {
  count: number;
  page: number;
  pages: number;
  types: { key: ArticleType; label: string; count: number }[];
  results: ArticleCard[];
}

export interface SeriesPick {
  series_slug: string;
  series_title: string;
  slug: string;
  title: string;
  label: string;
  summary: string;
  free_preview: boolean;
  cover: { id: number; url: string } | null;
}

export interface Article extends ArticleCard {
  /** The members' series episode closest to this article's topic. */
  series_pick?: SeriesPick | null;
  /** The free e-guide closest to this article's topic. */
  guide_pick?: GuideCard | null;
  body_html: string;
  seo_title: string;
  /** The browser/search title, by the backend's rule ("<title> | Zinwe", brand dropped past 60 characters). */
  page_title?: string;
  meta_description: string;
  updated_at: string;
  related: ArticleCard[];
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/** Blog image paths are relative to the API ("/api/blog/images/..."): make them loadable. */
export function blogAsset(path: string): string {
  return path.startsWith("/api/") ? `${API_BASE}${path}` : path;
}

/** Same, for every image inside an article body. */
export function withAssetBase(html: string): string {
  return API_BASE ? html.replace(/src="\/api\//g, `src="${API_BASE}/api/`) : html;
}

export function getArticles(
  params: { type?: ArticleType | ""; tag?: string; page?: number },
  signal?: AbortSignal,
): Promise<ArticlePage> {
  return authedRequest<ArticlePage>("/api/blog/articles/", {
    anonymous: true,
    signal,
    query: { type: params.type ?? "", tag: params.tag ?? "", page: params.page && params.page > 1 ? params.page : "" },
  });
}

export function getArticle(slug: string, signal?: AbortSignal): Promise<Article> {
  return authedRequest<Article>(`/api/blog/articles/${encodeURIComponent(slug)}/`, { anonymous: true, signal });
}

// --- Newsletter (double opt-in) ------------------------------------------------------

/** Always resolves the same way for a valid address (the list isn't revealed); a confirm email follows. */
export function subscribeToBlog(email: string, source: string): Promise<{ status: "check_inbox" }> {
  // The reader's time zone: series episodes arrive in their morning, wherever they are.
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    /* very old browser: the server's default zone is used */
  }
  return authedRequest("/api/blog/newsletter/subscribe/", {
    method: "POST",
    body: { email, source, timezone, ref: referralCode() },
    anonymous: true,
  });
}

export interface NewsletterResult {
  status: "active" | "unsubscribed";
  email: string;
  /** Confirm only: the reader key that opens the members-only series, and the page they signed up on. */
  access_key?: string;
  source?: string;
}

export function confirmBlogSubscription(token: string): Promise<NewsletterResult> {
  return authedRequest("/api/blog/newsletter/confirm/", { method: "POST", body: { token }, anonymous: true });
}

export function unsubscribeFromBlog(token: string): Promise<NewsletterResult> {
  return authedRequest("/api/blog/newsletter/unsubscribe/", { method: "POST", body: { token }, anonymous: true });
}
