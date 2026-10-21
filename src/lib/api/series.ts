/**
 * Members-only newsletter series (/api/blog/series/*): THE LAST FILE and any series after it.
 *
 * Everyone sees the series, its episode list and each episode's opening. The full episode and its files
 * are for confirmed newsletter subscribers, recognised by their reader key: it arrives in the
 * confirmation link (NewsletterPage stores it) or as `?k=` in an episode email link, and is kept in this
 * browser. Membership is free; the subscription is the membership.
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authedRequest } from "./http";
import type { ArticleCard } from "./blog";

type Image = ArticleCard["cover"];

export interface SeriesCard {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  cover: Image;
  cover_alt: string;
  planned_episodes: number;
  cadence: string;
  /** Episodes out so far. */
  released: number | null;
}

export interface Season {
  number: number;
  title: string;
  theme: string;
}

export interface EpisodeCard {
  slug: string;
  title: string;
  season: number;
  episode: number | null;
  summary: string;
  cover: Image;
  cover_alt: string;
  reading_minutes: number;
  published_at: string;
  free_preview: boolean;
  /** How many files come with it. */
  files: number;
}

/** A scheduled episode: number, title and date only. */
export interface UpcomingEpisode {
  slug: string;
  title: string;
  season: number;
  episode: number | null;
  published_at: string;
}

export interface Reader {
  /** Masked, e.g. r•••@example.com */
  email: string;
}

export interface SeriesDetail extends SeriesCard {
  seasons: Season[];
  episodes: EpisodeCard[];
  upcoming: UpcomingEpisode[];
  reader: Reader | null;
}

export interface EpisodeFile {
  title: string;
  content_type: string;
  size: number;
  /** Only when the episode is open to this reader. */
  url?: string;
  filename?: string;
}

export interface Episode extends EpisodeCard {
  /** THE LAST FILE · EPISODE 01 */
  label: string;
  series: SeriesCard;
  planned_episodes: number;
  season_info: Season | null;
  seo_title: string;
  meta_description: string;
  updated_at: string;
  teaser_html: string;
  locked: boolean;
  body_html: string;
  attachments: EpisodeFile[];
  previous: EpisodeCard | null;
  next: EpisodeCard | null;
  next_upcoming: UpcomingEpisode | null;
  reader: Reader | null;
}

export function getSeriesList(signal?: AbortSignal): Promise<{ results: SeriesCard[] }> {
  return authedRequest("/api/blog/series/", { anonymous: true, signal });
}

export function getSeries(slug: string, key: string, signal?: AbortSignal): Promise<SeriesDetail> {
  return authedRequest(`/api/blog/series/${encodeURIComponent(slug)}/`, { anonymous: true, signal, query: { k: key } });
}

export function getEpisode(slug: string, episode: string, key: string, signal?: AbortSignal): Promise<Episode> {
  return authedRequest(`/api/blog/series/${encodeURIComponent(slug)}/${encodeURIComponent(episode)}/`, {
    anonymous: true,
    signal,
    query: { k: key },
  });
}

export function episodePath(seriesSlug: string, episodeSlug: string): string {
  return `/blog/series/${seriesSlug}/${episodeSlug}`;
}

/** "E01", "S2 · E07" (the season only past the first). */
export function episodeCode(e: { season: number; episode: number | null }): string {
  const ep = e.episode ? `E${String(e.episode).padStart(2, "0")}` : "";
  return e.season > 1 ? `S${e.season} · ${ep}` : ep;
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function fileKind(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType === "application/zip") return "ZIP";
  if (contentType.startsWith("image/")) return "Image";
  return "File";
}

// --- The reader key -------------------------------------------------------------------

const STORAGE_KEY = "zinwe.reader.key";
const CHANGE_EVENT = "zinwe:reader";

// Used when the browser blocks storage (private mode): the key then lasts until the tab is closed.
let memoryKey = "";

function readStored(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

/** Keep (or with "" forget) this browser's reader key. */
export function storeReaderKey(key: string): void {
  memoryKey = key;
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the key still works for this page view */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * This browser's reader key. A `?k=` in the address (an email link) is stored, then removed from the
 * address bar so it isn't shared by copying the URL.
 */
export function useReaderKey(): [string, (key: string) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const fromUrl = new URLSearchParams(location.search).get("k") ?? "";
  const [key, setKey] = useState(() => fromUrl || readStored());

  useEffect(() => {
    if (!fromUrl) return;
    storeReaderKey(fromUrl); // the change event below picks it up
    const params = new URLSearchParams(location.search);
    params.delete("k");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "", hash: location.hash }, { replace: true });
  }, [fromUrl, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    const sync = () => setKey(readStored());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [key, storeReaderKey];
}
