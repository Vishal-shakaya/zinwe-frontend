import { useState, type FocusEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import type { Tip } from "../ui/useTip";

export interface MiniDay {
  key: string;
  /** "Mon". */
  day: string;
  /** Small line under the day (hidden on a phone). */
  sub?: string;
  /** Bar height value. */
  value: number;
  /** The flagged part of `value` (drawn on top, in `flagColor`). */
  flagged: number;
  /** Number over the bar ("" = none). */
  val: string;
  aria: string;
  tip: ReactNode;
}

/**
 * DashApps' mini week charts (New software, Remote control): Mon–Sun columns with a thin stacked stick, a grid
 * on the left, one focusable button per day. Hover or focus shows the shared tooltip; a click picks the day
 * (aria-pressed) to filter the list under it, a second click shows the whole week again.
 */
export function MiniDays({
  days,
  steps,
  minTop,
  flagColor,
  baseColor,
  dot = false,
  picked,
  onPick,
  label,
  tip,
}: {
  days: readonly MiniDay[];
  /** Candidate grid steps, smallest first. */
  steps: readonly number[];
  minTop: number;
  flagColor: string;
  baseColor: string;
  /** Remote control draws a dot on top of each stick that has anything. */
  dot?: boolean;
  picked: number;
  onPick: (i: number) => void;
  label: string;
  tip: Tip;
}): ReactElement {
  const [hov, setHov] = useState<number | null>(null);
  const top = Math.max(minTop, ...days.map((d) => d.value)) * 1.25;
  const step = steps.find((c) => c >= top / 4) ?? steps[steps.length - 1];
  const grid: number[] = [];
  for (let v = 0; v <= top; v += step) grid.push(v);
  const pc = (v: number) => ((v / top) * 100).toFixed(2);
  const enter = (i: number) => (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    setHov(i);
    const at = e.currentTarget.querySelector<HTMLElement>("[data-tip-at]") ?? e.currentTarget;
    tip.showAt(`mini-${label}-${days[i].key}`, days[i].tip, at.getBoundingClientRect(), { wide: true });
  };
  const leave = () => {
    setHov(null);
    tip.hide();
  };
  return (
    <div
      className="zp-lp-scroll"
      role="group"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Escape" && hov !== null) {
          e.stopPropagation();
          leave();
        }
      }}
    >
      <div className="zp-mini-in">
        <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, pointerEvents: "none" }}>
          {grid.map((v) => (
            <span key={v}>
              <span style={{ position: "absolute", left: 32, right: 0, height: 0, bottom: `${pc(v)}%`, borderTop: `1px solid ${v === 0 ? "#D9D4CA" : "#EFECE5"}` }} />
              <span
                className="z-num"
                style={{ position: "absolute", left: 0, width: 24, textAlign: "right", bottom: `${pc(v)}%`, transform: "translateY(50%)", fontSize: 11, lineHeight: 1, color: "#6B6358" }}
              >
                {v}
              </span>
            </span>
          ))}
        </span>
        <div style={{ display: "flex", position: "relative" }}>
          {days.map((d, i) => {
            const P = pc(d.value);
            const color = d.flagged ? flagColor : baseColor;
            return (
              <button
                key={d.key}
                type="button"
                className={`zp-lp-col${hov !== null && hov !== i ? " dim" : ""}`}
                aria-pressed={picked === i}
                aria-label={d.aria}
                onMouseEnter={enter(i)}
                onMouseLeave={leave}
                onFocus={enter(i)}
                onBlur={leave}
                onClick={() => onPick(picked === i ? -1 : i)}
              >
                <span className="zp-lp-plot">
                  <span className="z-num" style={{ position: "absolute", left: 0, right: 0, bottom: `calc(${P}% + ${dot ? 12 : 6}px)`, fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", color }}>
                    {d.val}
                  </span>
                  {d.value > 0 ? (
                    <span data-tip-at="1" style={{ position: "absolute", left: "50%", bottom: 0, width: 6, marginLeft: -3, height: `${P}%`, display: "flex", flexDirection: "column", gap: 2 }}>
                      {d.flagged > 0 ? <span style={{ display: "block", flex: `${d.flagged} 1 0`, minHeight: 2, background: dot ? "rgba(192,51,28,.55)" : flagColor, borderRadius: "3px 3px 0 0" }} /> : null}
                      {d.value - d.flagged > 0 ? (
                        <span
                          style={{
                            display: "block",
                            flex: `${d.value - d.flagged} 1 0`,
                            minHeight: 2,
                            background: dot ? "rgba(20,18,16,.28)" : baseColor,
                            borderRadius: d.flagged ? 0 : "3px 3px 0 0",
                          }}
                        />
                      ) : null}
                    </span>
                  ) : (
                    <span data-tip-at="1" style={{ position: "absolute", left: "50%", bottom: 0, width: 1, height: 1 }} />
                  )}
                  {dot && d.value > 0 ? (
                    <span
                      style={{ position: "absolute", left: "50%", width: 10, height: 10, marginLeft: -5, borderRadius: "50%", boxShadow: "0 0 0 3px #fff", bottom: `calc(${P}% - 5px)`, background: color }}
                    />
                  ) : null}
                </span>
                <span className="zp-lp-lab">
                  <b style={{ fontSize: 12, fontWeight: 600 }}>{d.day}</b>
                  {d.sub !== undefined ? (
                    <span className="zp-lp-sub" style={{ fontSize: 11, color: "#6B6358", lineHeight: 1.2 }}>
                      {d.sub}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
