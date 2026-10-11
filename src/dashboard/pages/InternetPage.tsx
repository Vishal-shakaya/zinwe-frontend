import { useCallback, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { RangeTabs } from "../components/RangeTabs";
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

const SPECS: SeriesSpec[] = [{ category: "web.domain", field: "count", label: "Websites visited" }];

export default function InternetPage(): ReactElement {
  usePageMeta({ title: "Online protection — Zinwe", description: "Website usage, blocked attempts, and website controls." });

  const [params] = useSearchParams();
  const focusDomain = normalizeDomain(params.get("block") ?? "") || undefined;

  const [days, setDays] = useState(7);
  const { metrics, events, now, resolveMember } = useFeatureData(days);
  const { policy, commit } = usePolicy();

  const loadSites = useCallback((s: AbortSignal) => getTopMetrics({ category: "web.domain", days, limit: 10 }, s), [days]);
  const sites = useResource(loadSites, { resetKey: days });

  const alerts = filterEvents(events.data, FEATURE_EVENT_TYPES.internet);
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, days) : [];
  const websites = metrics.data ? totalFor(metrics.data.categories, ["web.domain"], "total_count") : 0;

  return (
    <>
      <PageHeader
        title="Online protection"
        lede="Keep your team away from risky websites. See what's visited, review blocked attempts, and choose which sites your PCs can open."
      />

      <StatTiles
        tiles={[
          { value: metrics.data ? String(websites) : "–", label: "page loads tracked" },
          { value: String(alerts.length), label: "blocked attempts", tone: alerts.length > 0 ? "warn" : undefined },
        ]}
      />

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
          emptyText="No blocked-site attempts. Nothing to action here."
        />
      </section>

      {policy.data ? (
        <WebsiteCard block={policy.data.web} commit={commit} focusDomain={focusDomain} />
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      <section className="dash-card" aria-labelledby="net-chart-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="net-chart-title">
            Website usage
          </h2>
          <RangeTabs value={days} onChange={setDays} />
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
            emptyHint="No website activity recorded yet. It appears here once a PC with website protection on has been used."
          />
        )}
        <p className="dash-note">
          Counts pages opened in the foreground browser. The top sites are listed below; app usage is under App
          monitoring. Turn on
          “Block &amp; watch” to also stop risky sites.
        </p>
      </section>

      <section className="dash-card" aria-labelledby="net-top-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="net-top-title">
            Top websites
          </h2>
          <p className="dash-card__sub">Most-visited websites across your PCs, over the chosen range.</p>
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
      </section>

      <MetricsDisclosure />
    </>
  );
}
