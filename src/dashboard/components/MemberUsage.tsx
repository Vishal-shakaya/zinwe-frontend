import { useCallback, type ReactElement } from "react";
import { getMetrics } from "../../lib/api";
import { useEntitlements } from "../features/entitlements";
import { formatHours, toChartRows, type SeriesSpec } from "../features/metrics";
import { useResource } from "../useResource";

const DAYS = 7;
const SPECS: SeriesSpec[] = [{ category: "app.foreground", field: "seconds", label: "Active" }];
const LABEL = SPECS[0].label;

/**
 * A 7-day mini bar chart of one person's active time (time with an app in
 * front), for the bottom of their tile on Team & devices. One series, so no
 * legend: the caption names it. Each bar has a hover/focus tooltip, and the
 * same numbers sit in a screen-reader list.
 */
/** Plan enforcement: app usage (active time) is a Businesses feature; other plans get a one-line note. */
export function MemberUsage({ memberId, connected }: { memberId: number; connected: boolean }): ReactElement {
  const { has, upgradeFor } = useEntitlements();
  if (!has("app_usage")) {
    const plan = upgradeFor("app_usage");
    return (
      <div className="mu mu--empty">
        <span className="mu__cap">Active time · last 7 days</span>
        <span className="mu__none">Active time and app usage are on the {plan?.name ?? "next"} plan.</span>
      </div>
    );
  }
  return <MemberUsageChart memberId={memberId} connected={connected} />;
}

function MemberUsageChart({ memberId, connected }: { memberId: number; connected: boolean }): ReactElement {
  const load = useCallback(
    (signal: AbortSignal) => getMetrics({ member: memberId, days: DAYS, category: "app.foreground" }, signal),
    [memberId],
  );
  const metrics = useResource(load, { pollMs: 5 * 60_000 });

  if (!connected) {
    return (
      <div className="mu mu--empty">
        <span className="mu__cap">Active time · last 7 days</span>
        <span className="mu__none">Shows once their PC is connected.</span>
      </div>
    );
  }

  // The window is "now minus 7 days", which spans 8 calendar days; keep the last 7.
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, DAYS).slice(-DAYS) : [];
  const values = rows.map((r) => r[LABEL] as number);
  const total = values.reduce((sum, v) => sum + v, 0);
  const max = Math.max(...values, 1);

  return (
    <div className="mu" aria-busy={metrics.data === undefined}>
      <div className="mu__head">
        <span className="mu__cap">Active time · last 7 days</span>
        <b className="mu__total">{metrics.data ? formatHours(total) : "–"}</b>
      </div>
      {metrics.data === undefined ? (
        <div className="mu__bars mu__bars--skel" aria-hidden="true" />
      ) : total === 0 ? (
        <span className="mu__none">No activity recorded this week yet.</span>
      ) : (
        <>
          <ol className="mu__bars" aria-hidden="true">
            {rows.map((row, i) => {
              const v = values[i];
              return (
                <li key={row.t} className="mu__col">
                  <span className="mu__bar" style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 0}%` }} />
                  <span className="mu__day">{row.label.slice(0, 1)}</span>
                  <span className="mu__tip">
                    {row.label} · {formatHours(v)}
                  </span>
                </li>
              );
            })}
          </ol>
          <ul className="dash-sr">
            {rows.map((row, i) => (
              <li key={row.t}>
                {row.label}: {formatHours(values[i])}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default MemberUsage;
