/**
 * Small helpers for the v1.3.2 story pages (blog + members' series): honest time words for the release schedule,
 * "Ep 07 · 6 min" labels, and the "Continue" list this browser keeps (episodes the visitor opened; nothing leaves
 * the browser, and the page works the same without it).
 */
import { useEffect, useState } from "react";
import type { EpisodeCard, UpcomingEpisode } from "./api/series";

const DAY = 24 * 60 * 60 * 1000;

/** "Ep 07" (no season; the rail or page says which season). */
export function epNo(e: { episode: number | null }): string {
  return e.episode ? `Ep ${String(e.episode).padStart(2, "0")}` : "Episode";
}

/** "Mon, 2 Nov" in the reader's own time zone. A bare date ("2026-11-02") is read as that local day. */
export function dayText(iso: string): string {
  return toDate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** "Monday" */
export function weekdayText(iso: string): string {
  return toDate(iso).toLocaleDateString("en-GB", { weekday: "long" });
}

/** "in 3 hours", "tomorrow", "in 4 days", "today"; "" once it's past. */
export function whenText(iso: string, now: number = Date.now()): string {
  const at = toDate(iso).getTime();
  const ms = at - now;
  if (ms <= 0) return "";
  if (ms < 60 * 60 * 1000) return "within the hour";
  if (ms < 12 * 60 * 60 * 1000) return `in ${Math.round(ms / (60 * 60 * 1000))} hours`;
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d, 9);
  }
  return new Date(iso);
}

/** Released in the last seven days. */
export function isNew(iso: string, now: number = Date.now()): boolean {
  const t = new Date(iso).getTime();
  return now - t >= 0 && now - t < 7 * DAY;
}

/** What a tile says about access: honest, from the API's own flags. */
export type Access = "free" | "open" | "waiting" | "members";

export function accessOf(e: EpisodeCard, member: boolean): Access {
  if (e.free_preview) return "free";
  if (member && e.unlocked !== false) return "open";
  if (member) return "waiting";
  return "members";
}

export function soonestUpcoming(list: UpcomingEpisode[], now: number = Date.now()): UpcomingEpisode | undefined {
  return list.filter((u) => new Date(u.published_at).getTime() > now).sort((a, b) => a.published_at.localeCompare(b.published_at))[0];
}

// --- "Continue": the episodes this browser opened ------------------------------------------------------------

export interface RecentEpisode {
  series: string;
  seriesTitle: string;
  slug: string;
  title: string;
  season: number;
  episode: number | null;
  minutes: number;
  cover: string | null;
  at: number;
}

const RECENT_KEY = "zinwe.series.recent";

export function readRecent(): RecentEpisode[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as RecentEpisode[]) : [];
    return Array.isArray(list) ? list.filter((r) => r && typeof r.slug === "string" && typeof r.series === "string") : [];
  } catch {
    return [];
  }
}

export function noteRecent(r: Omit<RecentEpisode, "at">): void {
  try {
    const rest = readRecent().filter((x) => !(x.series === r.series && x.slug === r.slug));
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([{ ...r, at: Date.now() }, ...rest].slice(0, 12)));
  } catch {
    /* storage blocked: there's simply no "Continue" row */
  }
}

/** The current time, ticking once a minute (countdowns stay calm: no seconds). */
export function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}
