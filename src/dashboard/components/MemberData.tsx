import { useCallback, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { getMetrics, getTopMetrics } from "../../lib/api";
import { formatBytes, totalFor } from "../features/metrics";
import { useResource } from "../useResource";

const DAYS = 7;

/**
 * One person's internet data used over the last 7 days, on their Team & devices tile: the total, the website or
 * service that used the most, and a link to the full breakdown (Online protection, filtered to them).
 */
export function MemberData({ memberId, connected }: { memberId: number; connected: boolean }): ReactElement | null {
  const loadTotal = useCallback(
    (signal: AbortSignal) => getMetrics({ member: memberId, days: DAYS, category: "web.data.app" }, signal),
    [memberId],
  );
  const loadTop = useCallback(
    (signal: AbortSignal) => getTopMetrics({ category: "web.data.site", member: memberId, days: DAYS, limit: 1 }, signal),
    [memberId],
  );
  const total = useResource(loadTotal, { pollMs: 5 * 60_000 });
  const top = useResource(loadTop, { pollMs: 5 * 60_000 });
  if (!connected) return null;

  const bytes = total.data ? totalFor(total.data.categories, ["web.data.app"], "total_bytes") : 0;
  const site = top.data?.items[0];

  return (
    <div className="mu md">
      <div className="mu__head">
        <span className="mu__cap">Internet data · last 7 days</span>
        <b className="mu__total">{total.data ? formatBytes(bytes) : "–"}</b>
      </div>
      {total.data === undefined ? null : bytes === 0 ? (
        <span className="mu__none">No internet data recorded yet. Shows once their PC runs the latest Zinwe app.</span>
      ) : (
        <span className="md__line">
          {site ? (
            <>
              Most: <b>{site.key}</b> · {formatBytes(site.bytes)} ·{" "}
            </>
          ) : null}
          <Link to={`/app/internet?member=${memberId}`}>See where it went</Link>
        </span>
      )}
    </div>
  );
}
