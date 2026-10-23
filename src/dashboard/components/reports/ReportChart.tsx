import { useId, useMemo, useState, type ReactElement } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportDay, ReportDayPerson, TeamReport } from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { formatDate, friendlyDuration } from "../../../lib/format";
import { formatBytes } from "../../features/metrics";
import { clockOf, dayLabel } from "../../features/reportFormat";

/**
 * The Reports chart (FR-22). Team report: one bar per day, split into each person's share, so the team's total and
 * who did it read at once; with a single day, one bar per person. One person's report: their own day bars. Hover a
 * bar for that person's day (worked, active on the PC, breaks, start and finish, internet data, alerts); click it
 * for their report (team) or their day on Activity (one person). Switch between time worked and active on the PC.
 */

type Metric = "worked" | "active";
const FIELD = { worked: "worked_seconds", active: "active_seconds" } as const;

/** Brand orange first, then accents that stay apart from each other and readable on white. */
const COLORS = ["#d95d02", "#1f6feb", "#16794a", "#7a4cc2", "#0f7c8c", "#b8326a", "#8a5a00", "#4b5563"] as const;
const OTHERS_COLOR = "#b5b5ae";

/** One person's (or "Others") numbers on one day: what the hover card shows. */
interface Detail {
  name: string;
  date: string;
  color: string;
  memberId: number | null;
  worked_seconds: number;
  break_seconds: number;
  breaks: number;
  active_seconds: number;
  data_bytes: number;
  alerts: number;
  first_in: number | null;
  last_out: number | null;
  /** "Others": who is in it. */
  people?: string[];
}

interface Series {
  key: string;
  name: string;
  color: string;
  memberId: number | null;
  total: number;
}

interface Row {
  label: string;
  date: string;
  /** Bar value per series key (team days) or "value" (one bar per row). */
  [key: string]: unknown;
}

const blank = (date: string): Omit<Detail, "name" | "color" | "memberId"> => ({
  date,
  worked_seconds: 0,
  break_seconds: 0,
  breaks: 0,
  active_seconds: 0,
  data_bytes: 0,
  alerts: 0,
  first_in: null,
  last_out: null,
});

function fromPerson(p: ReportDayPerson, date: string, color: string): Detail {
  return { ...blank(date), ...p, date, color, memberId: p.member_id, name: p.name };
}

/** Adds `p` into the "Others" card for that day. */
function addTo(sum: Detail, p: ReportDayPerson): void {
  sum.worked_seconds += p.worked_seconds;
  sum.break_seconds += p.break_seconds;
  sum.breaks += p.breaks;
  sum.active_seconds += p.active_seconds;
  sum.data_bytes += p.data_bytes;
  sum.alerts += p.alerts;
  sum.people = [...(sum.people ?? []), p.name];
}

function dayTick(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  return days > 7 ? formatDate(date).replace(/ \d{4}$/, "") : d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Round axis steps so labels stay short ("30 min", "8 h", "1.5 h"). */
const STEPS = [300, 600, 900, 1800, 3600, 7200, 10800, 14400, 18000, 36000, 72000, 90000, 180000, 360000, 720000, 1800000];

function axis(max: number): { ticks: number[]; top: number } {
  const step = STEPS.find((s) => max / s <= 4) ?? STEPS[STEPS.length - 1];
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { ticks, top };
}

function axisLabel(v: number): string {
  if (v === 0) return "0";
  if (v < 3600) return `${Math.round(v / 60)} min`;
  return v % 3600 === 0 ? `${v / 3600} h` : `${(v / 3600).toFixed(1)} h`;
}

function DetailCard({ d, hasActive, hint }: { d: Detail; hasActive: boolean; hint?: string }): ReactElement {
  const times = d.first_in !== null || d.last_out !== null;
  return (
    <div className="rpt-tip">
      <p className="rpt-tip__who">
        <i style={{ background: d.color }} aria-hidden="true" />
        {d.people ? `Others (${d.people.length})` : d.name}
      </p>
      <p className="rpt-tip__day">{dayLabel(d.date)}</p>
      <dl>
        <div>
          <dt>Worked</dt>
          <dd>{friendlyDuration(d.worked_seconds)}</dd>
        </div>
        {hasActive ? (
          <div>
            <dt>Active on PC</dt>
            <dd>{d.active_seconds ? friendlyDuration(d.active_seconds) : "—"}</dd>
          </div>
        ) : null}
        <div>
          <dt>On breaks</dt>
          <dd>
            {friendlyDuration(d.break_seconds)}
            {d.breaks ? ` (${d.breaks})` : ""}
          </dd>
        </div>
        {times && !d.people ? (
          <div>
            <dt>Started – finished</dt>
            <dd>
              {clockOf(d.first_in)} – {clockOf(d.last_out)}
            </dd>
          </div>
        ) : null}
        {d.data_bytes ? (
          <div>
            <dt>Internet data</dt>
            <dd>{formatBytes(d.data_bytes)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Alerts</dt>
          <dd>{d.alerts}</dd>
        </div>
      </dl>
      {d.people ? <p className="rpt-tip__names">{d.people.join(", ")}</p> : null}
      {hint ? <p className="rpt-tip__hint">{hint}</p> : null}
    </div>
  );
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; payload?: unknown }>;
}

export interface ReportChartProps {
  report: TeamReport;
  /** Team report: open that person's own report. */
  onPerson?: (memberId: number) => void;
  /** One person's report: open that day on Activity. */
  onDay?: (date: string) => void;
}

export function ReportChart({ report, onPerson, onDay }: ReportChartProps): ReactElement | null {
  const titleId = useId();
  const person = report.member;
  const daily = report.daily;
  const hasActive = daily.some((d) => d.active_seconds > 0);
  const hasWorked = daily.some((d) => d.worked_seconds > 0);
  const [picked, setPicked] = useState<Metric>("worked");
  const metric: Metric = !hasWorked && hasActive ? "active" : !hasActive ? "worked" : picked;
  const field = FIELD[metric];
  const singleDay = !person && daily.length === 1;

  const model = useMemo(() => {
    if (person) {
      // One person: their own day bars, with the start and finish from person_days.
      const mine = new Map((report.person_days ?? []).map((d) => [d.date, d]));
      const rows: Row[] = daily.map((d: ReportDay) => {
        const own = mine.get(d.date) ?? d;
        const detail: Detail = {
          ...blank(d.date),
          worked_seconds: own.worked_seconds,
          break_seconds: own.break_seconds,
          breaks: own.breaks,
          active_seconds: own.active_seconds,
          data_bytes: own.data_bytes,
          alerts: own.alerts,
          first_in: own.first_in,
          last_out: own.last_out,
          name: person.name,
          color: COLORS[0],
          memberId: person.id,
        };
        return { label: dayTick(d.date, daily.length), date: d.date, me: detail[field], _d: { me: detail } };
      });
      const series: Series[] = [{ key: "me", name: person.name, color: COLORS[0], memberId: person.id, total: 0 }];
      return { rows, series };
    }

    // Team: who did the most over the period gets the first colour; past eight people the rest share "Others".
    const totals = new Map<string, { name: string; memberId: number | null; total: number; tie: number }>();
    for (const d of daily) {
      for (const p of d.by_person ?? []) {
        const t = totals.get(p.key) ?? { name: p.name, memberId: p.member_id, total: 0, tie: 0 };
        t.total += p[field];
        t.tie += p.worked_seconds + p.active_seconds;
        totals.set(p.key, t);
      }
    }
    const ranked = [...totals.entries()]
      .filter(([, t]) => t.total > 0)
      .sort((a, b) => b[1].total - a[1].total || b[1].tie - a[1].tie || a[1].name.localeCompare(b[1].name));
    const own = ranked.length > COLORS.length ? ranked.slice(0, COLORS.length - 1) : ranked;
    const series: Series[] = own.map(([key, t], i) => ({ key, name: t.name, color: COLORS[i], memberId: t.memberId, total: t.total }));
    const colorOf = new Map(series.map((s) => [s.key, s.color]));
    if (ranked.length > own.length) {
      const rest = ranked.slice(own.length);
      series.push({
        key: "others",
        name: `Others (${rest.length})`,
        color: OTHERS_COLOR,
        memberId: null,
        total: rest.reduce((n, [, t]) => n + t.total, 0),
      });
    }

    if (singleDay) {
      // One day: a bar per person instead of one split bar.
      const d = daily[0];
      const rows: Row[] = (d.by_person ?? [])
        .filter((p) => p[field] > 0)
        .map((p) => {
          // Past the eight colours, people are grey like the legend's "Others"; the hover card still names them.
          const detail = fromPerson(p, d.date, colorOf.get(p.key) ?? OTHERS_COLOR);
          return { label: p.name.split(/\s+/)[0], date: d.date, value: p[field], _d: { value: detail } };
        });
      return { rows, series };
    }

    const rows: Row[] = daily.map((d) => {
      const row: Row = { label: dayTick(d.date, daily.length), date: d.date };
      const details: Record<string, Detail> = {};
      for (const s of series) row[s.key] = 0;
      for (const p of d.by_person ?? []) {
        const color = colorOf.get(p.key);
        if (color) {
          row[p.key] = p[field];
          details[p.key] = fromPerson(p, d.date, color);
        } else if (series.some((s) => s.key === "others")) {
          const sum = (details.others ??= { ...blank(d.date), name: "Others", color: OTHERS_COLOR, memberId: null, people: [] });
          addTo(sum, p);
          row.others = (row.others as number) + p[field];
        }
      }
      row._d = details;
      return row;
    });
    return { rows, series };
  }, [daily, field, person, report.person_days, singleDay]);

  const max = Math.max(
    0,
    ...model.rows.map((r) =>
      singleDay ? (r.value as number) : model.series.reduce((n, s) => n + ((r[s.key] as number) || 0), 0),
    ),
  );
  if (max === 0) {
    return (
      <section className="dash-card rpt-chart" aria-label="Day by day">
        <div className="chart chart--empty" style={{ minHeight: 200 }}>
          <p className="chart__cap">{person ? "Their hours, day by day" : "The team's hours, day by day"}</p>
          <p className="chart__empty-text">Nothing recorded in this period yet.</p>
        </div>
      </section>
    );
  }

  const { ticks, top } = axis(max);
  const what = metric === "worked" ? "time worked" : "time active on the PC";
  const caption = person
    ? `${person.name}'s ${what}, day by day`
    : singleDay
      ? `Each person's ${what}`
      : `The team's ${what}, day by day, by person`;
  const clickable = Boolean(person ? onDay : onPerson);
  const hint = person ? (onDay ? "Click to open this day on Activity" : undefined) : onPerson ? "Click for their report" : undefined;

  const renderTip = ({ active, payload }: TipProps): ReactElement | null => {
    if (!active || !payload?.length) return null;
    const item = payload[payload.length - 1];
    const row = item.payload as Row | undefined;
    const details = row?._d as Record<string, Detail> | undefined;
    const d = details?.[String(item.dataKey)];
    if (!d) return null;
    return <DetailCard d={d} hasActive={hasActive} hint={d.memberId && !d.people ? hint : undefined} />;
  };

  const click = (row: Row | undefined, key: string) => {
    if (!row) return;
    if (person) return onDay?.(row.date);
    const d = (row._d as Record<string, Detail> | undefined)?.[key];
    if (d?.memberId && !d.people) onPerson?.(d.memberId);
  };

  return (
    <section className="dash-card rpt-chart" aria-label="Day by day">
      <figure className="chart" role="group" aria-labelledby={titleId}>
        <div className="rpt-chart__head">
          <figcaption className="chart__cap" id={titleId}>
            {caption}
          </figcaption>
          {hasActive && hasWorked ? (
            <div className="dash-range" role="group" aria-label="What the bars show">
              {(["worked", "active"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cx("dash-range__btn", metric === m && "is-on")}
                  aria-pressed={metric === m}
                  onClick={() => setPicked(m)}
                >
                  {m === "worked" ? "Worked" : "Active on PC"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={cx("chart__plot", clickable && "rpt-chart__plot--click")} style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
              <CartesianGrid stroke="#e6e6e1" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#6e6e6b" }}
                tickLine={false}
                axisLine={{ stroke: "#e6e6e1" }}
                minTickGap={8}
                interval={singleDay ? 0 : "preserveStartEnd"}
              />
              <YAxis
                width={48}
                domain={[0, top]}
                ticks={ticks}
                interval={0}
                tick={{ fontSize: 11, fill: "#6e6e6b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={axisLabel}
              />
              <Tooltip
                shared={false}
                cursor={{ fill: "rgba(13, 13, 14, 0.04)" }}
                content={renderTip}
                wrapperStyle={{ outline: "none", zIndex: 5 }}
                isAnimationActive={false}
              />
              {singleDay ? (
                <Bar
                  dataKey="value"
                  maxBarSize={56}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                  onClick={(entry) => click(entry?.payload as Row | undefined, "value")}
                >
                  {model.rows.map((r) => (
                    <Cell key={r.label + r.date} fill={(r._d as Record<string, Detail>).value.color} />
                  ))}
                </Bar>
              ) : (
                model.series.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="team"
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={person ? 0 : 1}
                    maxBarSize={56}
                    isAnimationActive={false}
                    onClick={(entry) => click(entry?.payload as Row | undefined, s.key)}
                  />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!person && model.series.length > 0 ? (
          <ul className="rpt-legend" aria-label="People in the chart">
            {model.series.map((s) => {
              const body = (
                <>
                  <i style={{ background: s.color }} aria-hidden="true" />
                  <span>{s.name}</span>
                  <b>{friendlyDuration(s.total)}</b>
                </>
              );
              return (
                <li key={s.key}>
                  {s.memberId && onPerson ? (
                    <button type="button" onClick={() => onPerson(s.memberId!)} title={`Open ${s.name}'s report`}>
                      {body}
                    </button>
                  ) : (
                    <span className="rpt-legend__item">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </figure>

      {/* Screen-reader fallback: the same numbers as a table. */}
      <table className="dash-sr">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{singleDay ? "Person" : "Day"}</th>
            {singleDay ? <th scope="col">{metric === "worked" ? "Worked" : "Active on PC"}</th> : null}
            {!singleDay
              ? model.series.map((s) => (
                  <th scope="col" key={s.key}>
                    {s.name}
                  </th>
                ))
              : null}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((r) => (
            <tr key={r.label + r.date}>
              <th scope="row">{singleDay ? r.label : dayLabel(r.date)}</th>
              {singleDay ? (
                <td>{friendlyDuration(r.value as number)}</td>
              ) : (
                model.series.map((s) => <td key={s.key}>{friendlyDuration(r[s.key] as number)}</td>)
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default ReportChart;
