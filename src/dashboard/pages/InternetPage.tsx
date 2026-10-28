import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { friendlyDuration } from "../../lib/format";
import { getTopMetrics, type MetricCategory, type WebPolicy } from "../../lib/api";
import { PagePlanGate } from "../components/PlanLock";
import { ScopeBanner } from "../components/AnalyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { useAnalyticsScope } from "../features/analyticsScope";
import { useEntitlements } from "../features/entitlements";
import { eventDomain, FEATURE_EVENT_TYPES } from "../features/events";
import { formatAxisBytes, formatBytes, toChartRows, totalFor, type SeriesSpec } from "../features/metrics";
import { WebsiteCard } from "../features/policyControls";
import { normalizeDomain } from "../features/policyText";
import { appSource, isCountedApp, mergeBySource, siteCategory, siteRows, siteSource } from "../features/usageSources";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { ColumnChart, type Column } from "../protection/ColumnChart";
import { CardError, HeaderFilters, ProtectionTabs, Tile } from "../protection/parts";
import { firstName, plural, whenText, withinDays } from "../protection/helpers";
import { PageHead } from "../shell/PageHead";
import { EmptyBlock, SkRows } from "../ui/States";
import { TipBody } from "../ui/Tooltip";
import { useTip } from "../ui/useTip";
import { useResource } from "../useResource";
import "../../styles/dash13/protection.css";

const TITLE = "Internet usage";
const LEDE = "Data used and time online, by site and app. Team totals unless you pick a person. Names only, never full addresses.";

// One metric per chart: data (web.data.app bytes, FR-04) or time (web.domain seconds). The agent credits a site
// with the time its tab is in front; the sample count is not a number of visits, so only time is shown (FIX-014).
const SPECS: SeriesSpec[] = [
  { category: "web.data.app", field: "bytes", label: "data" },
  { category: "web.domain", field: "seconds", label: "time" },
];
const TYPES = FEATURE_EVENT_TYPES.internet;
const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "This week" },
  { days: 30, label: "This month" },
] as const;
const SITES_SHOWN = 12;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BLOCK_CAT: Record<string, string> = { adult: "Adult", gambling: "Gambling", malware: "Malware", phishing: "Scam" };

function hourText(h: number): string {
  return `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
}

/** Plan enforcement: the whole page is web; without it, a lock card shows instead. */
export default function InternetPage(): ReactElement {
  return (
    <PagePlanGate
      module="web"
      title={TITLE}
      lede={LEDE}
      lock="See which websites your team visits, block risky categories or any site you choose, and review blocked attempts."
    >
      <InternetPageContent />
    </PagePlanGate>
  );
}

function useTop(category: MetricCategory, days: number, member: number | null, on = true) {
  const load = useCallback(
    (s: AbortSignal) => (on ? getTopMetrics({ category, days, member: member ?? undefined, limit: 100 }, s) : Promise.resolve({ category, items: [] })),
    [category, days, member, on],
  );
  return useResource(load, { resetKey: `${days}:${member ?? "all"}:${on}` });
}

/** The rule bar: what the website rule does now, and the way to change it. */
function ruleText(web: WebPolicy | undefined): { name: string; text: string } {
  if (!web) return { name: "Website rule", text: "Loading…" };
  if (!web.enabled) return { name: "Off", text: "Websites and time online aren't recorded" };
  if (web.mode !== "block") return { name: "Watch only", text: "Records sites and time online, blocks nothing" };
  const cats = (web.categories.length ? web.categories : (["adult", "gambling", "malware", "phishing"] as const)).map((c) =>
    c === "phishing" ? "scam" : c,
  );
  const list = cats.length > 1 ? `${cats.slice(0, -1).join(", ")} and ${cats[cats.length - 1]}` : cats[0];
  const extra = web.custom_domains.length ? ` and ${plural(web.custom_domains.length, "site", "sites")} you added` : "";
  return { name: "Block & watch", text: `Blocks ${list} sites${extra}` };
}

interface BlockedGroup {
  key: string;
  site: string;
  cat: string;
  who: string;
  last: string;
  n: number;
}

function InternetPageContent(): ReactElement {
  usePageMeta({ title: "Internet usage — Zinwe", description: "Data used and time online, by site and app, and blocked attempts." });
  const [params] = useSearchParams();
  const focusDomain = normalizeDomain(params.get("block") ?? "") || undefined;
  const tip = useTip();

  const scope = useAnalyticsScope();
  const { days, member } = scope;
  const { metrics, events, now, resolveMember } = useFeatureData(days, member, TYPES);
  const { policy, commit } = usePolicy();
  const appsOn = useEntitlements().has("app_usage");

  const sites = useTop("web.domain", days, member);
  const dataSites = useTop("web.data.site", days, member);
  const appTime = useTop("app.foreground", days, member, appsOn);

  const [picked, setMetric] = useState<"data" | "time" | null>(null);
  const [q, setQ] = useState("");
  const [allSites, setAllSites] = useState(false);

  const who = scope.person;
  const whoWord = who ? firstName(who.name) : "Team";
  const periodWord = days <= 1 ? "last 24 hours" : `last ${days} days`;
  const loadingMetrics = metrics.data === undefined && !metrics.error;
  const dataUsed = metrics.data ? totalFor(metrics.data.categories, ["web.data.app"], "total_bytes") : 0;
  const siteSeconds = metrics.data ? totalFor(metrics.data.categories, ["web.domain"], "total_seconds") : 0;

  // Blocked attempts in the range (same events as Alerts), grouped by site and person.
  const blockedEvents = useMemo(() => withinDays(filterEvents(events.data, TYPES), days, now), [events.data, days, now]);
  const blocked: BlockedGroup[] = useMemo(() => {
    const groups = new Map<string, BlockedGroup & { at: number }>();
    for (const e of blockedEvents) {
      const site = eventDomain(e) ?? "unknown site";
      const person = resolveMember(e.device_id);
      const key = `${site}|${e.device_id}`;
      const at = Date.parse(e.occurred_at);
      const g = groups.get(key);
      if (g) {
        g.n += 1;
        if (at > g.at) {
          g.at = at;
          g.last = e.occurred_at;
        }
      } else {
        const raw = (e.data ?? {}).category;
        const cat = typeof raw === "string" && raw ? (BLOCK_CAT[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)) : "Blocked";
        groups.set(key, { key, site, cat, who: person?.name ?? e.hostname, last: e.occurred_at, n: 1, at });
      }
    }
    return [...groups.values()].sort((a, b) => b.at - a.at);
  }, [blockedEvents, resolveMember]);
  const blockedTries = blockedEvents.length;

  // Chart: one bar per hour (24 hours) or day, the newest last.
  const rows = useMemo(() => {
    if (!metrics.data) return [];
    const all = toChartRows(metrics.data.series, SPECS, days);
    return all.slice(-(days <= 1 ? 24 : days));
  }, [metrics.data, days]);
  // Data first (the board's default); time when the PCs sent no data figures yet, until the owner picks.
  const metric = picked ?? (metrics.data && dataUsed <= 0 && siteSeconds > 0 ? "time" : "data");
  const isData = metric === "data";
  const fmtV = (v: number) => (isData ? formatBytes(v) : friendlyDuration(v));
  const cols: Column[] = rows.map((r, i) => {
    const d = new Date(r.t);
    const last = i === rows.length - 1;
    const gb = Number(r.data) || 0;
    const secs = Number(r.time) || 0;
    const title =
      days <= 1
        ? `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} · ${hourText(d.getHours())}–${hourText((d.getHours() + 1) % 24)}${last ? " (so far)" : ""}`
        : `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}${last ? " (today, so far)" : ""}`;
    const label =
      days <= 1 ? (d.getHours() % 3 === 0 ? hourText(d.getHours()) : "") : days <= 7 ? (last ? "Today" : `${DOW[d.getDay()]} ${d.getDate()}`) : (rows.length - 1 - i) % 7 === 0 ? `${MON[d.getMonth()]} ${d.getDate()}` : "";
    const value = isData ? gb : secs;
    return {
      key: String(r.t),
      label,
      value,
      short: isData ? formatBytes(gb).replace(" GB", "") : secs < 3600 ? `${Math.round(secs / 60)}m` : `${Math.round(secs / 360) / 10}`,
      aria: `${title}: data used ${formatBytes(gb)}, time online ${friendlyDuration(secs)}`,
      tip: (
        <TipBody
          title={who ? who.name : "Whole team"}
          color={isData ? "#F26A0A" : "#141210"}
          sub={title}
          rows={[
            { label: "Data used", value: formatBytes(gb) },
            { label: "Time online", value: friendlyDuration(secs) },
          ]}
        />
      ),
    };
  });
  const chartEmpty = cols.every((c) => c.value <= 0);
  let peak = 0;
  cols.forEach((c, i) => {
    if (c.value > cols[peak].value) peak = i;
  });
  const total = isData ? dataUsed : siteSeconds;
  const peakTitle = rows[peak] ? new Date(rows[peak].t) : null;

  // Most time: websites and apps together (a browser's time is its websites, so browsers aren't listed).
  const most = useMemo(() => {
    const s = mergeBySource(sites.data?.items ?? [], siteSource, 500).map((i) => ({ name: i.key, kind: "Site" as const, seconds: i.seconds }));
    const a = mergeBySource((appTime.data?.items ?? []).filter((i) => isCountedApp(i.key, true)), appSource, 500).map((i) => ({
      name: i.key,
      kind: "App" as const,
      seconds: i.seconds,
    }));
    return [...s, ...a].filter((x) => x.seconds > 0).sort((x, y) => y.seconds - x.seconds).slice(0, 5);
  }, [sites.data, appTime.data]);

  // Websites: time and data by service; sites someone tried and was blocked from close the list.
  const custom = new Set((policy.data?.web.custom_domains ?? []).map((d) => d.toLowerCase()));
  const siteList = useMemo(() => siteRows(sites.data?.items ?? [], dataSites.data?.items ?? []), [sites.data, dataSites.data]);
  const tableRows = [
    ...siteList.map((r) => ({ ...r, blocked: custom.has(r.domain.toLowerCase()), tried: false })),
    ...blocked
      .filter((b, i, arr) => arr.findIndex((x) => x.site === b.site) === i && !siteList.some((r) => r.domain === b.site))
      .map((b) => ({ name: siteSource(b.site) === b.site ? b.site : siteSource(b.site), domain: b.site, seconds: 0, bytes: 0, blocked: true, tried: true })),
  ];
  const query = q.trim().toLowerCase();
  const matched = tableRows.filter((r) => !query || `${r.name} ${r.domain}`.toLowerCase().includes(query));
  const shownSites = allSites || query ? matched : matched.slice(0, SITES_SHOWN);
  const busiest = siteList[0];
  const rule = ruleText(policy.data?.web);

  const teamSize = scope.members?.length;

  return (
    <div className="zp-prot zp-online">
      <ProtectionTabs />
      <PageHead
        title={TITLE}
        lede={LEDE}
        actions={
          <HeaderFilters
            members={scope.members}
            member={member}
            onMember={scope.setMember}
            periods={PERIODS}
            days={days}
            onDays={scope.setDays}
          />
        }
      />
      <ScopeBanner scope={scope} />

      <section className="zp-tiles" aria-label="Summary">
        <Tile
          label="Data used"
          value={metrics.data ? formatBytes(dataUsed) : "–"}
          sub="Sent and received, all apps"
          loading={loadingMetrics}
          tip={tip}
          tipKey="t-data"
          def={{ text: "Data sent and received by every app on your PCs, over the chosen period. Local network copies don't count." }}
        />
        <Tile
          label="Time online"
          value={metrics.data ? friendlyDuration(siteSeconds) : "–"}
          sub={who ? who.name : teamSize !== undefined ? `Whole team · ${plural(teamSize, "person", "people")}` : "Whole team"}
          loading={loadingMetrics}
          tip={tip}
          tipKey="t-time"
          def={{ text: "Time a website was open in front in a browser on your PCs. Never what was on the page." }}
        />
        <Tile
          label="Busiest site"
          value={busiest ? busiest.name : "–"}
          sub={busiest ? `${friendlyDuration(busiest.seconds)} · most time` : "No websites yet"}
          loading={sites.data === undefined && !sites.error}
        />
        <Tile
          label="Blocked attempts"
          value={events.data ? String(blockedTries) : "–"}
          sub={blockedTries ? `${plural(blocked.length, "site", "sites")}, all stopped by your rule` : "Nothing blocked"}
          loading={events.data === undefined && !events.error}
        />
      </section>

      <section className="z-card zp-chartcard" aria-labelledby="zp-chart-h">
        <div className="zp-chartmain">
          <div className="zp-chart-head">
            <div style={{ minWidth: 0 }}>
              <h2 id="zp-chart-h" className="zp-h2">
                {isData ? "Data used" : "Time online"}
              </h2>
              <span className="zp-note">
                {days <= 1 ? "By hour, last 24 hours" : `By day, last ${days} days`}
                {who ? ` · ${who.name}` : " · whole team"}
              </span>
            </div>
            <div className="zp-seg" role="group" aria-label="Chart shows">
              {(["data", "time"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}>
                  {k === "data" ? "Data" : "Time"}
                </button>
              ))}
            </div>
          </div>
          {metrics.data === undefined && metrics.error ? (
            <CardError error={metrics.error} onRetry={metrics.reload} />
          ) : loadingMetrics ? (
            <div role="status" aria-busy="true" style={{ height: 262, display: "flex", alignItems: "flex-end", gap: 10, padding: "18px 0 24px 44px" }}>
              <span className="z-sr">Loading the chart</span>
              {[40, 62, 18, 8, 70, 84, 46].map((h, i) => (
                <span key={i} className="z-sk" style={{ flex: 1, height: `${h}%` }} />
              ))}
            </div>
          ) : chartEmpty ? (
            <EmptyBlock icon="websites" title={isData ? "No internet data in this period" : "No time online in this period"}>
              {who
                ? `Nothing recorded for ${who.name} in this period.`
                : isData
                  ? "Internet data shows once your PCs run the latest Zinwe app."
                  : "Website time shows once your PCs run the latest Zinwe app (each person can update from the Zinwe window)."}
            </EmptyBlock>
          ) : (
            <>
              <ColumnChart
                cols={cols}
                tone={isData ? "data" : "time"}
                tip={tip}
                axis={(v) => (isData ? formatAxisBytes(v) : friendlyDuration(v))}
                label={`${isData ? "Data used" : "Time online"}, ${periodWord}: ${cols.map((c) => `${c.aria.split(":")[0]} ${fmtV(c.value)}`).join("; ")}`}
              />
              <p className="z-num" style={{ margin: "2px 0 0", fontSize: 13, color: "#4A443C" }}>
                <b style={{ color: "#141210" }}>
                  {whoWord} total, {periodWord}: {fmtV(total)}
                </b>
                {peakTitle
                  ? ` · ${days <= 1 ? "busiest hour" : "busiest day"} ${
                      days <= 1 ? hourText(peakTitle.getHours()) : `${DOW[peakTitle.getDay()]}, ${peakTitle.getDate()} ${MON[peakTitle.getMonth()]}`
                    } (${fmtV(cols[peak]?.value ?? 0)})`
                  : ""}
              </p>
            </>
          )}
        </div>

        <aside className="zp-most">
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>Most time</h3>
            <span className="zp-note">Websites and apps together</span>
          </div>
          {sites.error || appTime.error ? (
            <CardError
              error={sites.error ?? appTime.error}
              onRetry={() => {
                sites.reload();
                appTime.reload();
              }}
            />
          ) : sites.data === undefined || appTime.data === undefined ? (
            <SkRows label="Loading most time" rows={4} avatar={false} />
          ) : most.length === 0 ? (
            <p className="zp-empty-line">Nothing recorded in this period.</p>
          ) : (
            <ol className="zp-most__list">
              {most.map((m) => (
                <li key={`${m.kind}-${m.name}`}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <b className="z-ell" style={{ fontWeight: 600, flex: 1 }}>
                      {m.name}
                    </b>
                    <span className={`zp-tag${m.kind === "Site" ? " site" : ""}`}>{m.kind}</span>
                    <span className="z-num" style={{ fontSize: 13, color: "#4A443C", whiteSpace: "nowrap" }}>
                      {friendlyDuration(m.seconds)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="zp-bar">
                    <span style={{ width: `${((m.seconds / most[0].seconds) * 100).toFixed(1)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </section>

      <Link to="/app/rules#web" className="zp-rulebar">
        <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="z-pill" style={{ background: "#141210", color: "#fff" }}>
            Rule
          </span>
          <b>{rule.name}</b>
          <span style={{ color: "#4A443C" }}>{rule.text}</span>
        </span>
        <span style={{ fontWeight: 600, color: "#A84505" }}>Change in Rules →</span>
      </Link>

      {focusDomain && policy.data ? <WebsiteCard block={policy.data.web} commit={commit} focusDomain={focusDomain} /> : null}

      <div className="zp-split">
        <section className="z-card zp-tablecard" aria-labelledby="zp-sites-h">
          <div className="zp-tablehead">
            <h2 id="zp-sites-h" className="zp-h2">
              Websites
            </h2>
            <label className="zp-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6459" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="z-sr">Search sites</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites" />
            </label>
          </div>
          {sites.error || dataSites.error ? (
            <CardError
              error={sites.error ?? dataSites.error}
              onRetry={() => {
                sites.reload();
                dataSites.reload();
              }}
            />
          ) : sites.data === undefined ? (
            <SkRows label="Loading websites" rows={5} avatar={false} />
          ) : tableRows.length === 0 ? (
            <EmptyBlock icon="websites" title="No websites in this period">
              {who ? `Nothing recorded for ${who.name} in this period.` : "Websites show once a PC with Zinwe is used."}
            </EmptyBlock>
          ) : (
            <>
              <div className="zp-tbl-wrap">
                <table className="zp-tbl">
                  <caption className="z-sr">Websites: time and data used{who ? `, ${who.name}` : ", whole team"}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Site</th>
                      <th scope="col">Category</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Time
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Data
                      </th>
                      <th scope="col">Rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownSites.map((x) => (
                      <tr key={`${x.name}|${x.domain}`}>
                        <td data-label="Site">
                          <span>
                            <b style={{ fontWeight: 600 }}>{x.name}</b>
                            {x.name !== x.domain ? (
                              <>
                                <br />
                                <span className="z-mono" style={{ fontSize: 12, color: "#6B6459" }}>
                                  {x.domain}
                                </span>
                              </>
                            ) : null}
                          </span>
                        </td>
                        <td data-label="Category">
                          <span className="z-pill" style={{ background: "#F2EFE8", color: "#4A443C" }}>
                            {siteCategory(x.name, x.domain)}
                          </span>
                        </td>
                        <td data-label="Time" className="z-num" style={{ textAlign: "right" }}>
                          {x.tried || x.seconds <= 0 ? "—" : friendlyDuration(x.seconds)}
                        </td>
                        <td data-label="Data" className="z-num" style={{ textAlign: "right" }}>
                          {x.tried || x.bytes <= 0 ? "—" : formatBytes(x.bytes)}
                        </td>
                        <td data-label="Rule">
                          <span className="z-pill" style={x.blocked ? { background: "#141210", color: "#fff" } : { background: "#E7F2EA", color: "#1E6B3A" }}>
                            {x.blocked ? (x.tried ? "Tried, blocked" : "Blocked") : "Allowed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {matched.length === 0 ? <p style={{ margin: 0, padding: "20px 16px", color: "#6B6459" }}>No site matches &ldquo;{q.trim()}&rdquo;.</p> : null}
              {!query && matched.length > SITES_SHOWN ? (
                <div style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="z-btn sm" onClick={() => setAllSites((v) => !v)}>
                    {allSites ? "Show fewer" : `Show all ${matched.length}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
          <p className="zp-foot">
            Background traffic (Windows updates, sync) is left out. Local network copies (to a NAS or another PC) don&rsquo;t count as internet data.
          </p>
        </section>

        <div className="zp-side">
          <section className="z-card zp-blocked" aria-labelledby="zp-blocked-h">
            <h2 id="zp-blocked-h" className="zp-h2">
              Blocked attempts
            </h2>
            {events.data === undefined && events.error ? (
              <CardError error={events.error} onRetry={events.reload} />
            ) : events.data === undefined ? (
              <SkRows label="Loading blocked attempts" rows={3} avatar={false} />
            ) : blocked.length === 0 ? (
              <p className="zp-empty-line" style={{ borderTop: "1px solid #F0EDE6", paddingTop: 10 }}>
                Nothing blocked in this period.
              </p>
            ) : (
              blocked.slice(0, 6).map((b) => (
                <div key={b.key} className="zp-blocked__row">
                  <span className="z-pill amber">{b.cat}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b className="z-mono" style={{ fontSize: 13, overflowWrap: "anywhere" }}>
                      {b.site}
                    </b>
                    <br />
                    <span style={{ fontSize: 12, color: "#6B6459" }}>
                      {b.who} · {whenText(b.last, now)}
                      {b.n > 1 ? ` · ${b.n} times` : ""}
                    </span>
                  </span>
                </div>
              ))
            )}
            <Link to="/app/alerts" style={{ fontSize: 13, fontWeight: 600 }}>
              See in Alerts →
            </Link>
          </section>
        </div>
      </div>

      <MetricsDisclosure />
      {tip.node}
    </div>
  );
}
