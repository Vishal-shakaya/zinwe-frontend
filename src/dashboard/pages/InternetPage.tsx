import { useCallback, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics } from "../../lib/api";
import { PagePlanGate } from "../components/PlanLock";
import { AlertsTable } from "../components/AlertsTable";
import { ScopeBanner, ScopeControls, SectionLabel } from "../components/AnalyticsScope";
import { useAnalyticsScope } from "../features/analyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { ErrorState, PageHeader } from "../components/States";
import { TopUsageTable } from "../components/TopUsageTable";
import { UsageChart } from "../components/UsageChart";
import { FEATURE_EVENT_TYPES } from "../features/events";
import { toChartRows, totalFor, type SeriesSpec } from "../features/metrics";
import { WebsiteCard } from "../features/policyControls";
import { normalizeDomain } from "../features/policyText";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { useResource } from "../useResource";
import { StatTiles } from "../components/StatTiles";
import { appSource, mergeBySource, siteSource } from "../features/usageSources";
import { formatBytes } from "../features/metrics";

const SPECS: SeriesSpec[] = [{ category: "web.domain", field: "count", label: "Websites visited" }];
const TYPES = FEATURE_EVENT_TYPES.internet;

/** Plan enforcement: the whole page is web; without it, a lock card shows instead. */
export default function InternetPage(): ReactElement {
  return (
    <PagePlanGate
      module="web"
      title="Online protection"
      lede="Keep your team away from risky websites."
      lock="See which websites your team visits, block risky categories or any site you choose, and review blocked attempts."
    >
      <InternetPageContent />
    </PagePlanGate>
  );
}

/**
 * Tiles → Trends (website usage) → Alerts (blocked attempts) → Manage (website rules) → Details (top
 * websites, what Zinwe shares). The header picks who (everyone / one person) and the range.
 */
function InternetPageContent(): ReactElement {
  usePageMeta({ title: "Online protection — Zinwe", description: "Website usage, blocked attempts, and website controls." });

  const [params] = useSearchParams();
  const focusDomain = normalizeDomain(params.get("block") ?? "") || undefined;

  const scope = useAnalyticsScope();
  const { days, member } = scope;
  const { metrics, events, now, resolveMember } = useFeatureData(days, member, TYPES);
  const { policy, commit } = usePolicy();

  const loadSites = useCallback(
    (s: AbortSignal) => getTopMetrics({ category: "web.domain", days, member: member ?? undefined, limit: 10 }, s),
    [days, member],
  );
  const sites = useResource(loadSites, { resetKey: `${days}:${member ?? "all"}` });

  // Internet data used (FR-04): by app (everything) and by website (when the PC resolved the site's name).
  const loadDataApps = useCallback(
    (s: AbortSignal) => getTopMetrics({ category: "web.data.app", days, member: member ?? undefined, limit: 50 }, s),
    [days, member],
  );
  const loadDataSites = useCallback(
    (s: AbortSignal) => getTopMetrics({ category: "web.data.site", days, member: member ?? undefined, limit: 50 }, s),
    [days, member],
  );
  const dataApps = useResource(loadDataApps, { resetKey: `${days}:${member ?? "all"}` });
  const dataSites = useResource(loadDataSites, { resetKey: `${days}:${member ?? "all"}` });
  const dataUsed = metrics.data ? totalFor(metrics.data.categories, ["web.data.app"], "total_bytes") : 0;

  const alerts = filterEvents(events.data, TYPES);
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, days) : [];
  const websites = metrics.data ? totalFor(metrics.data.categories, ["web.domain"], "total_count") : 0;

  return (
    <>
      <PageHeader
        title="Online protection"
        lede="Keep your team away from risky websites. See what's visited, review blocked attempts, and choose which sites your PCs can open."
        actions={<ScopeControls scope={scope} />}
      />
      <ScopeBanner scope={scope} />

      <StatTiles
        tiles={[
          { value: metrics.data ? String(websites) : "–", label: "page loads tracked", icon: "globe", hint: "Pages opened in a browser on your PCs, over the chosen range." },
          { value: events.data ? String(alerts.length) : "–", label: "blocked attempts", tone: alerts.length > 0 ? "warn" : "good", icon: "shield", hint: "Times someone tried to open a site your rules block." },
          { value: metrics.data ? formatBytes(dataUsed) : "–", label: "internet data used", icon: "activity", hint: "Data sent and received by apps on your PCs, over the chosen range." },
        ]}
      />

      <SectionLabel title="Trends" />
      <section className="dash-card" aria-labelledby="net-chart-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="net-chart-title">
            Website usage
          </h2>
          <p className="dash-card__sub">{scope.label}</p>
        </div>
        {metrics.data === undefined && metrics.error ? (
          <ErrorState message={errorMessage(metrics.error)} onRetry={metrics.reload} retrying={metrics.pending} />
        ) : (
          <UsageChart
            rows={rows}
            specs={SPECS}
            format={(v) => String(Math.round(v))}
            caption="Page loads recorded over time"
            loading={metrics.data === undefined}
            emptyHint={
              scope.person
                ? `No website activity from ${scope.person.name} in this range.`
                : "No website activity recorded yet. It appears here once a PC with website protection on has been used."
            }
          />
        )}
      </section>

      <section className="dash-card" aria-labelledby="net-data-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="net-data-title">
            Internet data used
          </h2>
          <p className="dash-card__sub">Which apps and websites use your internet · {scope.label}</p>
        </div>
        {dataApps.error || dataSites.error ? (
          <ErrorState
            message={errorMessage(dataApps.error ?? dataSites.error)}
            onRetry={() => {
              dataApps.reload();
              dataSites.reload();
            }}
            retrying={dataApps.pending || dataSites.pending}
          />
        ) : (
          <div className="net-data">
            <TopUsageTable
              items={mergeBySource(dataApps.data?.items ?? [], appSource)}
              keyLabel="App"
              metric="bytes"
              loading={dataApps.data === undefined}
              caption="Internet data used by app"
              emptyText="No data use recorded yet. It appears once a PC with Online protection on is used."
            />
            <TopUsageTable
              items={mergeBySource(dataSites.data?.items ?? [], siteSource)}
              keyLabel="Website or service"
              metric="bytes"
              loading={dataSites.data === undefined}
              caption="Internet data used by website"
              emptyText="No websites recorded yet."
            />
          </div>
        )}
        <p className="dash-note">
          Sizes only — never what was sent, typed or watched. Websites show when the PC looked up the site&rsquo;s
          name itself; data used inside an app always counts under the app.
        </p>
      </section>

      <SectionLabel title="Alerts" />
      <section className="dash-card" aria-labelledby="net-alerts-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="net-alerts-title">
            Blocked-site attempts
          </h2>
          <p className="dash-card__sub">When someone tries to open a blocked site, it shows here so you can act.</p>
        </div>
        <AlertsTable
          events={alerts}
          limit={10}
          resolveMember={resolveMember}
          now={now}
          caption="Blocked website attempts"
          emptyText={scope.person ? `No blocked-site attempts from ${scope.person.name}.` : "No blocked-site attempts. Nothing to action here."}
        />
      </section>

      <SectionLabel title="Manage" note="Website rules apply to every PC in your company." />
      {policy.data ? (
        <WebsiteCard block={policy.data.web} commit={commit} focusDomain={focusDomain} />
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      <SectionLabel title="Details" />
      <section className="dash-card" aria-labelledby="net-top-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="net-top-title">
            Top websites
          </h2>
          <p className="dash-card__sub">Most-visited websites · {scope.label}</p>
        </div>
        {sites.error ? (
          <ErrorState message={errorMessage(sites.error)} onRetry={sites.reload} retrying={sites.pending} />
        ) : (
          <TopUsageTable
            items={sites.data?.items ?? []}
            keyLabel="Website"
            showCount
            loading={sites.data === undefined}
            caption="Top websites by time"
            emptyText="No website activity recorded yet. It appears once a PC with website tracking on has been used in a browser."
          />
        )}
        <p className="dash-note">
          Counts pages opened in the foreground browser. App usage is under App monitoring. Turn on “Block &amp; watch”
          to also stop risky sites.
        </p>
      </section>

      <MetricsDisclosure />
    </>
  );
}
