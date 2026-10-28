import { useMemo, useState, type ReactElement } from "react";
import type { TeamReport } from "../../lib/api";
import { formatBytes } from "../features/metrics";
import { clockOf } from "../features/reportFormat";
import { TipBody } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";
import { axisLbl, daysBetween, fmt, fmtS, niceMax } from "./dates";
import { buildColumns, type DayFacts, type Metric } from "./model";

const GRID = [0, 1, 2, 3, 4];

function factRows(f: DayFacts): Array<{ label: string; value: string }> {
  return [
    { label: "Worked", value: fmtS(f.worked) },
    { label: "Active on PC", value: fmtS(f.active) },
    { label: "On breaks", value: fmtS(f.breakSec) + (f.breaks ? ` (${f.breaks})` : "") },
    { label: "Started – finished", value: `${clockOf(f.firstIn)} – ${clockOf(f.lastOut)}` },
    { label: "Internet data", value: f.dataBytes ? formatBytes(f.dataBytes) : "0 MB" },
    { label: "Alerts", value: String(f.alerts) },
  ];
}

/**
 * "Who worked when" (board DashReports): one stacked column per day (per hour for a single day), one segment per
 * person. Hovering a segment or a legend chip lights that person up across every column; a click pins them
 * (their By person row and Performance row light up too). Again = clear. One person's report: a click opens
 * that day on Activity. Phone: hidden behind "Show chart", with a one-line total in its place.
 */
export function WhoWorkedWhen({
  report,
  colorOf,
  pin,
  onPin,
  onDay,
  tip,
}: {
  report: TeamReport;
  colorOf: (key: string) => string;
  pin: string | null;
  onPin: (key: string | null) => void;
  /** One person's report: open that day on Activity. */
  onDay?: (date: string) => void;
  tip: Tip;
}): ReactElement {
  const [metric, setMetric] = useState<Metric>("worked");
  const [hover, setHover] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const one = Boolean(report.member);
  const { columns, hourly } = useMemo(() => buildColumns(report, metric), [report, metric]);
  const max = niceMax(Math.max(1, ...columns.map((c) => c.total)));
  const empty = columns.every((c) => c.total === 0);
  const totals = new Map<string, { facts: DayFacts; total: number }>();
  for (const c of columns)
    for (const s of c.segs) {
      const t = totals.get(s.facts.key) ?? { facts: s.facts, total: 0 };
      t.total += s.value;
      totals.set(s.facts.key, t);
    }
  const legend = [...totals.values()].sort((a, b) => b.total - a.total);
  // Same stacking order in every column: whoever did the most over the period sits at the bottom.
  const rank = new Map(legend.map((l, i) => [l.facts.key, i]));
  const pinOk = pin !== null && totals.has(pin);
  const lit = hover ?? (pinOk ? pin : null);
  const grand = columns.reduce((t, c) => t + c.total, 0);
  const nDays = daysBetween(report.from, report.to);
  const summary = empty
    ? "No work in this period."
    : `${metric === "worked" ? "Worked " : "Active on PC "}${fmt(grand)} in total, ${hourly ? "by hour" : `over ${nDays} days`}.`;
  const hint = one ? (onDay ? "Click to open this day on Activity" : undefined) : "Click for their report";

  const unhover = () => {
    setHover(null);
    tip.hide();
  };

  return (
    <section
      className="z-card"
      aria-labelledby="ww-h"
      style={{ padding: "18px 18px 14px", display: "flex", flexDirection: "column", gap: 14 }}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        if (hover) unhover();
        else onPin(null);
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 id="ww-h" style={{ margin: 0, fontSize: 17 }}>
          Who worked when
        </h2>
        <div role="group" aria-label="Measure" className={`rp-segs${show ? "" : " rp-shut"}`}>
          {(
            [
              ["worked", "Worked"],
              ["active", "Active on PC"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`rp-seg${metric === k ? " on" : ""}`}
              aria-pressed={metric === k}
              onClick={() => {
                setMetric(k);
                unhover();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rp-ph-only">
        <p className="rp-num" style={{ margin: "0 0 10px", fontSize: 13, color: "#3A352E" }}>
          {summary}
        </p>
        <button
          type="button"
          className="z-btn sm"
          aria-expanded={show}
          aria-controls="ww-body"
          onClick={() => {
            setShow(!show);
            unhover();
          }}
        >
          {show ? "Hide chart" : "Show chart"}
        </button>
      </div>
      <div id="ww-body" className={show ? "rp-ww-body" : "rp-ww-body rp-shut"} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", columnGap: 10 }}>
          <div style={{ position: "relative", height: 240 }} aria-hidden="true">
            {GRID.map((g) => (
              <span key={g} className="rp-axl" style={{ bottom: `${g * 25}%` }}>
                {axisLbl((max / 4) * g)}
              </span>
            ))}
          </div>
          <div style={{ position: "relative", height: 240 }}>
            {GRID.map((g) => (
              <span
                key={g}
                style={{ position: "absolute", left: 0, right: 0, bottom: `${g * 25}%`, height: 1, background: g === 0 ? "#DCD6CB" : "#F0EDE6" }}
              />
            ))}
            <div role="group" aria-label={`Who worked when, by ${hourly ? "hour" : "day"}`} style={{ position: "absolute", inset: 0, display: "flex" }}>
              {columns.map((c, k) => {
                let cum = 0;
                return (
                  <div key={`${c.date}-${k}`} style={{ flex: 1, minWidth: 0, position: "relative", height: "100%" }}>
                    <div className="rp-ww-stack">
                      {[...c.segs].sort((x, y) => (rank.get(x.facts.key) ?? 0) - (rank.get(y.facts.key) ?? 0)).map((s, j) => {
                        const bottom = (cum / max) * 100;
                        const h = (s.value / max) * 100;
                        cum += s.value;
                        const f = s.facts;
                        const color = colorOf(f.key);
                        const rows = factRows(f);
                        const top = j === c.segs.length - 1;
                        const open = (el: HTMLElement) => {
                          setHover(f.key);
                          tip.showAt(
                            `ww-${k}-${j}`,
                            <TipBody title={f.name} color={color} sub={c.day} rows={rows} hint={hint} />,
                            el.getBoundingClientRect(),
                          );
                        };
                        return (
                          <button
                            key={f.key}
                            type="button"
                            className="rp-ww-seg"
                            style={{
                              bottom: `${bottom.toFixed(2)}%`,
                              height: `${h.toFixed(2)}%`,
                              backgroundColor: color,
                              opacity: lit !== null && lit !== f.key ? 0.35 : 1,
                              borderBottom: j > 0 ? "2px solid transparent" : undefined,
                              borderRadius: top ? "6px 6px 0 0" : undefined,
                            }}
                            aria-label={`${f.name}, ${c.day}. ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}.${hint ? ` ${hint}.` : ""}`}
                            aria-pressed={!one ? pinOk && pin === f.key : undefined}
                            onMouseEnter={(e) => open(e.currentTarget)}
                            onFocus={(e) => open(e.currentTarget)}
                            onMouseLeave={unhover}
                            onBlur={unhover}
                            onClick={() => {
                              if (one) {
                                if (onDay) onDay(c.date);
                                return;
                              }
                              onPin(pinOk && pin === f.key ? null : f.key);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {empty ? (
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B6459", fontSize: 13 }}>
                No work in this period.
              </span>
            ) : null}
          </div>
          <span />
          <div style={{ display: "flex", paddingTop: 8 }} aria-hidden="true">
            {columns.map((c, k) => (
              <span key={`${c.date}-${k}`} className="rp-xl">
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {legend.map(({ facts, total }) => {
            const on = pinOk && pin === facts.key;
            return (
              <button
                key={facts.key}
                type="button"
                className={`rp-lg${on ? " on" : ""}`}
                style={{ opacity: lit !== null && lit !== facts.key ? 0.35 : 1 }}
                aria-pressed={on}
                aria-label={`${facts.name}, ${fmtS(total)}${on ? ", highlighted" : ""}`}
                onMouseEnter={() => setHover(facts.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(facts.key)}
                onBlur={() => setHover(null)}
                onClick={() => onPin(on ? null : facts.key)}
              >
                <span style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: colorOf(facts.key) }} />
                {facts.name}
                <span className="rp-num" style={{ color: "#6B6459", fontWeight: 500 }}>
                  {fmtS(total)}
                </span>
              </button>
            );
          })}
          {pinOk ? (
            <button type="button" className="rp-lnk" style={{ fontSize: 12, marginLeft: 4 }} onClick={() => onPin(null)}>
              Show all
            </button>
          ) : null}
        </div>
        <p className="rp-k" style={{ margin: 0 }}>
          Active on PC: time the PC was in use (keyboard or mouse), not what was done.
        </p>
      </div>
    </section>
  );
}
