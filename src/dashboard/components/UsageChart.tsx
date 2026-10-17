import { useId, type ReactElement } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartRow, SeriesSpec } from "../features/metrics";
import { DashIcon } from "./DashIcon";

/**
 * A small, brand-coloured area chart over time. One <Area> per series, with an
 * accessible fallback table for screen readers and tidy loading/empty states.
 *
 * The dashboard is a light-only theme (see site.css), so colours are fixed and
 * chosen for AA contrast on the white card background.
 */

/** Brand first, then two accessible accents that read clearly beside orange. */
const PALETTE = ["#d95d02", "#1f6feb", "#16794a", "#8a3c00"] as const;

export interface UsageChartProps {
  rows: ChartRow[];
  specs: SeriesSpec[];
  /** Formats a value for the tooltip and y-axis (bytes, hours, plain count). */
  format: (value: number) => string;
  /** A shorter y-axis label, when the tooltip's is too long (e.g. whole MB / GB). */
  axisFormat?: (value: number) => string;
  /** Visible, describes what the chart shows (also the accessible name). */
  caption: string;
  height?: number;
  loading?: boolean;
  /** Shown instead of the chart when there's no usage yet. */
  emptyHint?: string;
}

export function UsageChart({
  rows,
  specs,
  format,
  axisFormat,
  caption,
  height = 220,
  loading = false,
  emptyHint = "No usage recorded for this period yet.",
}: UsageChartProps): ReactElement {
  const titleId = useId();

  if (loading) {
    return (
      <div className="chart" aria-busy="true">
        <p className="chart__cap">{caption}</p>
        <div className="chart__skel" style={{ height }} aria-hidden="true" />
      </div>
    );
  }

  const empty = rows.length === 0 || rows.every((r) => specs.every((s) => (r[s.label] as number) === 0));
  if (empty) {
    return (
      <div className="chart chart--empty" style={{ minHeight: height }}>
        <span className="chart__empty-mark" aria-hidden="true">
          <DashIcon name="activity" />
        </span>
        <p className="chart__cap">{caption}</p>
        <p className="chart__empty-text">{emptyHint}</p>
      </div>
    );
  }

  return (
    <figure className="chart" role="group" aria-labelledby={titleId}>
      <figcaption className="chart__cap" id={titleId}>
        {caption}
      </figcaption>
      <div className="chart__plot" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
            <defs>
              {specs.map((spec, i) => (
                <linearGradient id={`${titleId}-${i}`} key={spec.label} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#e6e6e1" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6e6e6b" }}
              tickLine={false}
              axisLine={{ stroke: "#e6e6e1" }}
              minTickGap={16}
            />
            <YAxis
              width={44}
              tick={{ fontSize: 12, fill: "#6e6e6b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (axisFormat ?? format)(v)}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => format(Number(value))}
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #e6e6e1",
                fontSize: 13,
                boxShadow: "0 12px 40px -16px rgba(13,13,14,0.18)",
              }}
              labelStyle={{ fontWeight: 600, color: "#0d0d0e" }}
            />
            {specs.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /> : null}
            {specs.map((spec, i) => (
              <Area
                key={spec.label}
                type="monotone"
                dataKey={spec.label}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                fill={`url(#${titleId}-${i})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader fallback: the same numbers as a table. */}
      <table className="dash-sr">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {specs.map((spec) => (
              <th scope="col" key={spec.label}>
                {spec.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.t}>
              <th scope="row">{row.label}</th>
              {specs.map((spec) => (
                <td key={spec.label}>{format(row[spec.label] as number)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default UsageChart;
