/**
 * Turn the raw metrics response (hour buckets, one row per category) into the
 * small, chart-ready shapes the feature pages plot.
 *
 * The backend series is oldest-first and already summed across the owner's PCs,
 * but it collapses per-key detail — so we can chart usage *over time per
 * category*, not a per-domain / per-app breakdown. Pages note that limitation.
 */
import type { MetricCategoryTotal, MetricPoint } from "../../lib/api";

export type MetricField = "count" | "bytes" | "seconds";

export interface SeriesSpec {
  category: string;
  /** The field to read for this line. */
  field: MetricField;
  /** The key used in the chart row + legend. */
  label: string;
}

export interface ChartRow {
  /** Bucket label for the x-axis, e.g. "Mon" or "14:00". */
  label: string;
  /** Sortable key (ms) behind the label. */
  t: number;
  [seriesLabel: string]: number | string;
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dayNumFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const hourFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric" });

function bucketKey(date: Date, byHour: boolean): number {
  const d = new Date(date);
  if (byHour) d.setMinutes(0, 0, 0);
  else d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketLabel(ms: number, byHour: boolean, spanDays: number): string {
  const date = new Date(ms);
  if (byHour) return hourFmt.format(date);
  return spanDays > 8 ? dayNumFmt.format(date) : dayFmt.format(date);
}

/**
 * Build chart rows for the given series specs over `days`. Buckets by hour when
 * the window is a single day, otherwise by calendar day. Every bucket in range
 * is present (zero-filled) so the x-axis reads evenly even with sparse data.
 */
export function toChartRows(points: MetricPoint[], specs: SeriesSpec[], days: number): ChartRow[] {
  const byHour = days <= 1;
  const now = Date.now();
  const stepMs = byHour ? 3_600_000 : 86_400_000;
  const start = bucketKey(new Date(now - days * 86_400_000), byHour);

  // Seed every bucket from start → now with zeros for each series.
  const rows = new Map<number, ChartRow>();
  for (let t = start; t <= now; t += stepMs) {
    const key = bucketKey(new Date(t), byHour);
    if (!rows.has(key)) {
      const row: ChartRow = { label: bucketLabel(key, byHour, days), t: key };
      for (const spec of specs) row[spec.label] = 0;
      rows.set(key, row);
    }
  }

  const want = new Map(specs.map((s) => [s.category, s] as const));
  for (const point of points) {
    const spec = want.get(point.category);
    if (!spec) continue;
    const parsed = Date.parse(point.bucket_start);
    if (Number.isNaN(parsed)) continue;
    const key = bucketKey(new Date(parsed), byHour);
    let row = rows.get(key);
    if (!row) {
      row = { label: bucketLabel(key, byHour, days), t: key };
      for (const s of specs) row[s.label] = 0;
      rows.set(key, row);
    }
    row[spec.label] = (row[spec.label] as number) + point[spec.field];
  }

  return [...rows.values()].sort((a, b) => a.t - b.t);
}

/** Total of one field across a set of categories (for stat tiles). */
export function totalFor(
  categories: MetricCategoryTotal[],
  wanted: readonly string[],
  field: "total_count" | "total_bytes" | "total_seconds",
): number {
  return categories
    .filter((c) => wanted.includes(c.category))
    .reduce((sum, c) => sum + (c[field] ?? 0), 0);
}

/** True when no series has a non-zero value — lets a page show an empty state. */
export function isAllZero(rows: ChartRow[], specs: SeriesSpec[]): boolean {
  return rows.every((row) => specs.every((spec) => (row[spec.label] as number) === 0));
}

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** 1536 → "1.5 KB"; whole numbers drop the decimal. */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${UNITS[unit]}`;
}

/** 5400 → "1.5h"; under an hour → "45m". */
export function formatHours(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(Math.round((seconds / 3600) * 10) / 10).toFixed(1)}h`;
}
