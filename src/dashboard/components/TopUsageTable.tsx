import type { ReactElement } from "react";
import type { MetricTopItem } from "../../lib/api";
import { formatBytes, formatHours } from "../features/metrics";

/** Which measure ranks and labels the rows: time spent, bytes transferred, or a plain count. */
export type TopMetric = "time" | "bytes" | "count";

interface TopUsageTableProps {
  items: MetricTopItem[];
  /** Header for the first column, e.g. "Website", "App", "USB drive". */
  keyLabel: string;
  /** "time" → seconds/formatHours (sites, apps); "bytes" → bytes/formatBytes (transfers). */
  metric?: TopMetric;
  /** Show the count column (files / sends). Not for web.domain or app.foreground: their count is sample ticks. */
  showCount?: boolean;
  /** Header for the count column when shown. */
  countLabel?: string;
  loading?: boolean;
  emptyText: string;
  caption: string;
}

/**
 * A compact "most used" table (top sites / apps / USB drives / shares) with a
 * subtle usage bar behind each row. Reads the per-key breakdown from
 * GET /metrics/top/ and ranks by time or bytes.
 */
export function TopUsageTable({
  items,
  keyLabel,
  metric = "time",
  showCount,
  countLabel = "Count",
  loading,
  emptyText,
  caption,
}: TopUsageTableProps): ReactElement {
  if (loading) {
    return <p className="dash-note">Loading…</p>;
  }
  if (items.length === 0) {
    return <p className="dash-note">{emptyText}</p>;
  }
  const valueOf = (i: MetricTopItem) => (metric === "bytes" ? i.bytes : metric === "count" ? i.count : i.seconds);
  const formatValue =
    metric === "bytes" ? formatBytes : metric === "count" ? (n: number) => n.toLocaleString() : formatHours;
  const valueHeader = metric === "bytes" ? "Data" : metric === "count" ? "Times" : "Time";
  const max = Math.max(...items.map(valueOf), 1);

  return (
    <div className="dash-top" role="table" aria-label={caption}>
      <div className="dash-top__row dash-top__row--head" role="row">
        <span role="columnheader">{keyLabel}</span>
        <span role="columnheader">{valueHeader}</span>
        {showCount ? <span role="columnheader">{countLabel}</span> : null}
      </div>
      {items.map((item) => (
        <div className="dash-top__row" role="row" key={item.key}>
          <span role="cell" className="dash-top__key">
            <span
              className="dash-top__bar"
              style={{ width: `${Math.max(3, Math.round((valueOf(item) / max) * 100))}%` }}
              aria-hidden="true"
            />
            <span className="dash-top__name" title={item.key}>
              {item.key}
            </span>
          </span>
          <span role="cell" className="dash-top__num">
            {formatValue(valueOf(item))}
          </span>
          {showCount ? (
            <span role="cell" className="dash-top__num">
              {item.count.toLocaleString()}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
