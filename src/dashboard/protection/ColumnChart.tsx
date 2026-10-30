import { useState, type FocusEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import type { Tip } from "../ui/useTip";

export interface Column {
  key: string;
  /** x-axis label ("" leaves the slot empty, e.g. the month view labels one day a week). */
  label: string;
  value: number;
  /** Short value over the bar ("1.2", "45m"). */
  short: string;
  /** Screen-reader sentence with every fact the tooltip shows. */
  aria: string;
  tip: ReactNode;
}

/** The board's axis tops (each splits into four round quarters). */
const STEPS = [0.4, 0.8, 1.2, 2, 4, 8, 12, 16, 20, 24, 40, 60, 80, 120, 160, 200, 400, 800];

/** A tidy axis top: the smallest board step at or above `v`. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  return STEPS.find((x) => x >= v) ?? Math.ceil(v / 200) * 200;
}

/** The axis top in round units: minutes or hours for time (seconds), MB or GB for data (bytes). */
function scaleMax(v: number, tone: "data" | "time"): number {
  if (tone === "time") {
    const unit = v >= 3600 ? 3600 : 60;
    return niceMax(v / unit) * unit;
  }
  let unit = 1;
  while (v / unit >= 1000 && unit < 1024 ** 4) unit *= 1024;
  return niceMax(v / unit) * unit;
}

/**
 * DashOnline's chart: one metric, one axis, one focusable bar per bucket. Hover, focus or tap shows the shared
 * tooltip above the bar and dims the others; Escape closes it.
 */
export function ColumnChart({
  cols,
  axis,
  tone,
  label,
  tip,
}: {
  cols: readonly Column[];
  /** Formats a grid value for the y-axis. */
  axis: (v: number) => string;
  /** data = orange, time = ink (one metric per chart). */
  tone: "data" | "time";
  label: string;
  tip: Tip;
}): ReactElement {
  const [hov, setHov] = useState<number | null>(null);
  const n = cols.length;
  const vMax = scaleMax(Math.max(0, ...cols.map((c) => c.value)), tone);
  const stickW = n > 12 ? 12 : 28;
  const showVals = n <= 12;
  const enter = (i: number) => (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    setHov(i);
    const at = e.currentTarget.querySelector<HTMLElement>("[data-tip-at]") ?? e.currentTarget;
    tip.showAt(`col-${cols[i].key}`, cols[i].tip, at.getBoundingClientRect(), { wide: true });
  };
  const leave = () => {
    setHov(null);
    tip.hide();
  };
  return (
    <div className="zp-chart">
      <div
        className="zp-plot"
        role="group"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Escape") leave();
        }}
        style={{ position: "relative", height: 220, margin: "18px 0 0 44px" }}
      >
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className="zp-gl" aria-hidden="true" style={{ bottom: `${k * 25}%` }}>
            <span className="zp-ax">{k === 0 ? "0" : axis((vMax * k) / 4)}</span>
          </div>
        ))}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          {cols.map((c, i) => {
            const pct = (c.value / vMax) * 100;
            const dim = hov !== null && hov !== i;
            return (
              <div key={c.key} className="zp-col">
                <button type="button" className="zp-hit" aria-label={c.aria} onMouseEnter={enter(i)} onMouseLeave={leave} onFocus={enter(i)} onBlur={leave}>
                  <span
                    data-tip-at="1"
                    className={`zp-stk${tone === "time" ? " t" : ""}${dim ? " dim" : ""}`}
                    style={{ width: `min(${stickW}px, 70%)`, height: c.value <= 0 ? 0 : pct < 1 ? 2 : `${pct.toFixed(2)}%` }}
                  />
                </button>
                {showVals ? (
                  <span className="zp-val" aria-hidden="true" style={{ bottom: `calc(${Math.max(pct, 1).toFixed(2)}% + 5px)`, color: tone === "data" ? "#A84505" : "#141210" }}>
                    {c.short}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="zp-plot zp-xl" aria-hidden="true" style={{ display: "flex", margin: "0 0 0 44px", borderTop: "1px solid #E5E5E5", paddingTop: 6 }}>
        {cols.map((c) => (
          <span key={c.key} style={{ flex: "1 1 0", minWidth: 0, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#6B6B6B", whiteSpace: "nowrap" }}>{c.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
