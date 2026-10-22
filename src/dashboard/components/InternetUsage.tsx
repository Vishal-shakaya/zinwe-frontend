import { useMemo, useState, type ReactElement } from "react";
import type { MetricTopItem } from "../../lib/api";
import { cx } from "../../lib/cx";
import { friendlyDuration } from "../../lib/format";
import { formatBytes } from "../features/metrics";
import { appSource, mergeBySource, siteSource } from "../features/usageSources";

type View = "sites" | "apps";

interface Row {
  name: string;
  seconds: number;
  visits: number;
  bytes: number;
}

/** Time rows (seconds/visits) and data rows (bytes) for the same thing, joined by its friendly name. */
function join(time: readonly MetricTopItem[], data: readonly MetricTopItem[], nameOf: (key: string) => string): Row[] {
  const rows = new Map<string, Row>();
  const row = (name: string) => {
    const existing = rows.get(name) ?? { name, seconds: 0, visits: 0, bytes: 0 };
    rows.set(name, existing);
    return existing;
  };
  for (const i of mergeBySource(time, nameOf, 500)) {
    const r = row(i.key);
    r.seconds += i.seconds;
    r.visits += i.count;
  }
  for (const i of mergeBySource(data, nameOf, 500)) row(i.key).bytes += i.bytes;
  return [...rows.values()].sort((a, b) => b.seconds - a.seconds || b.bytes - a.bytes || a.name.localeCompare(b.name));
}

/**
 * FR-18: the whole picture of internet and app use — every website with how long it was open, how often and how
 * much data it used, and every app with its time and data — searchable, for whoever and whatever range the
 * page's header picked.
 */
export function InternetUsage({
  siteTime,
  siteData,
  appTime,
  appData,
  loading,
  appsOn,
}: {
  siteTime: readonly MetricTopItem[];
  siteData: readonly MetricTopItem[];
  appTime: readonly MetricTopItem[];
  appData: readonly MetricTopItem[];
  loading: boolean;
  /** The plan includes app usage (else the Apps tab shows data used only). */
  appsOn: boolean;
}): ReactElement {
  const [view, setView] = useState<View>("sites");
  const [query, setQuery] = useState("");
  const sites = useMemo(() => join(siteTime, siteData, siteSource), [siteTime, siteData]);
  const apps = useMemo(() => join(appsOn ? appTime : [], appData, appSource), [appsOn, appTime, appData]);
  const all = view === "sites" ? sites : apps;
  const q = query.trim().toLowerCase();
  const rows = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;

  return (
    <div className="iu">
      <div className="iu__bar">
        <div className="iu__tabs" role="tablist" aria-label="Show">
          {(["sites", "apps"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={cx("rpt-chip", view === v && "is-on")}
              onClick={() => setView(v)}
            >
              {v === "sites" ? `Websites (${sites.length})` : `Apps (${apps.length})`}
            </button>
          ))}
        </div>
        <label className="dash-filter iu__search">
          <span className="dash-sr">Search</span>
          <input
            type="search"
            value={query}
            placeholder={view === "sites" ? "Search websites" : "Search apps"}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <p className="dash-note">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="dash-note">
          {q ? `Nothing matches “${query.trim()}”.` : "Nothing recorded in this range yet."}
        </p>
      ) : (
        <div className="rpt-scroll iu__list">
          <table className="rpt-table">
            <caption className="dash-sr">{view === "sites" ? "Websites: time, visits and data used" : "Apps: time and data used"}</caption>
            <thead>
              <tr>
                <th scope="col">{view === "sites" ? "Website or service" : "App"}</th>
                <th scope="col">Time</th>
                {view === "sites" ? <th scope="col">Visits</th> : null}
                <th scope="col">Data used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{r.seconds > 0 ? friendlyDuration(r.seconds) : "—"}</td>
                  {view === "sites" ? <td>{r.visits > 0 ? r.visits : "—"}</td> : null}
                  <td>{r.bytes > 0 ? formatBytes(r.bytes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
