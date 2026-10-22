/**
 * Free e-guides (/api/blog/guides/*): the library, a guide's page and the members' download. The page is public;
 * the PDF needs the free membership (the same reader key that opens the series, lib/api/series useReaderKey).
 */
import { authedRequest } from "./http";
import { blogAsset } from "./blog";

type Image = { id: number; url: string } | null;

export interface GuideCard {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  audience: string;
  cover: Image;
  cover_alt: string;
  page_count: number;
  /** The numbers on the cover: [{value: "30", label: "Day action plan"}]. */
  highlights: { value: string; label: string }[];
  /** Tracking code, e.g. "guide-scams". */
  campaign: string;
}

export interface GuideDetail extends GuideCard {
  description: string;
  contents: { title: string; note: string }[];
  feature_line: string;
  samples: Image[];
  size: number;
  filename: string;
  updated_at: string;
  member: boolean;
  /** Members only. */
  download_url: string | null;
  reader: { email: string; ref_code: string } | null;
  others: GuideCard[];
}

export function getGuides(signal?: AbortSignal): Promise<{ results: GuideCard[] }> {
  return authedRequest("/api/blog/guides/", { anonymous: true, signal });
}

export function getGuide(slug: string, key: string, signal?: AbortSignal): Promise<GuideDetail> {
  return authedRequest(`/api/blog/guides/${encodeURIComponent(slug)}/`, { anonymous: true, signal, query: { k: key } });
}

export function guidePath(slug: string): string {
  return `/blog/guides/${slug}`;
}

/** The members' download link (needs the reader key). */
export function guideDownloadHref(slug: string, key: string): string {
  return `${blogAsset(`/api/blog/guides/${encodeURIComponent(slug)}/download/`)}?k=${encodeURIComponent(key)}`;
}

/** Start the download in this tab (the response is an attachment, so the page stays). */
export function downloadGuide(slug: string, key: string): void {
  const a = document.createElement("a");
  a.href = guideDownloadHref(slug, key);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** "Start Zinwe free" from a guide, tagged with its campaign. */
export function guideStartFreeUrl(campaign: string): string {
  const q = new URLSearchParams({ plan: "free", utm_source: "guide", utm_medium: "site", utm_campaign: campaign });
  return `/signup?${q.toString()}`;
}

/** A guide slug from a sign-up source like "/blog/guides/<slug>", or "". */
export function guideFromSource(source: string | undefined): string {
  const m = /^\/blog\/guides\/([-\w]+)$/.exec((source ?? "").split("?")[0].replace(/\/+$/, ""));
  return m ? m[1] : "";
}

export function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
