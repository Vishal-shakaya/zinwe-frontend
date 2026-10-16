import { useCallback, useState, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PagePlanGate, PlanLock } from "../components/PlanLock";
import { RangeTabs } from "../components/RangeTabs";
import { StatTiles } from "../components/StatTiles";
import { ErrorState, PageHeader } from "../components/States";
import { TopUsageTable } from "../components/TopUsageTable";
import { UsageChart } from "../components/UsageChart";
import { useEntitlements } from "../features/entitlements";
import { FEATURE_EVENT_TYPES } from "../features/events";
import { formatHours, toChartRows, totalFor, type SeriesSpec } from "../features/metrics";
import { RemoteSoftwareCard } from "../features/policyControls";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { useResource } from "../useResource";

const SPECS: SeriesSpec[] = [{ category: "remote.detected", field: "count", label: "Remote sessions" }];

const APPS_COLLECTED = [
  { label: "Apps used", detail: "Which app is open in front (e.g. chrome, winword) and for how long, rolled up by the hour." },
  { label: "Remote-control tools", detail: "When a tool like AnyDesk or TeamViewer runs, and on which PC." },
  { label: "New software", detail: "The name of software installed on a PC, and when." },
];
const APPS_NEVER = [
  "Keystrokes or anything typed",
  "Screenshots or screen recording",
  "What's inside an app — documents, chats or files",
  "Anything said or shown during a remote session",
];

/** Plan enforcement: remote tools + software are Startups; the app-usage parts are Businesses. */
export default function RemotePage(): ReactElement {
  return (
    <PagePlanGate
      module="remote_access"
      title="Application monitoring"
      lede="Spot remote-control tools like AnyDesk or TeamViewer and new software on your PCs."
      lock="Get an alert when someone runs AnyDesk, TeamViewer or another remote-control tool, block the ones you don't use, and see every new program installed on your PCs."
    >
      <RemotePageContent />
    </PagePlanGate>
  );
}

function RemotePageContent(): ReactElement {
  const appsOn = useEntitlements().has("app_usage");
  usePageMeta({ title: "Application monitoring — Zinwe", description: "Which apps your team uses, remote-control tools and new software." });

  const [days, setDays] = useState(7);
  const { metrics, events, now, resolveMember } = useFeatureData(days);
  const { policy, commit } = usePolicy();

  const loadInstalls = useCallback((s: AbortSignal) => getTopMetrics({ category: "software.installed", days, limit: 10 }, s), [days]);
  const installsTop = useResource(loadInstalls, { resetKey: days });
  const loadTools = useCallback((s: AbortSignal) => getTopMetrics({ category: "remote.tool", days, limit: 10 }, s), [days]);
  const toolsTop = useResource(loadTools, { resetKey: days });
  const loadApps = useCallback((s: AbortSignal) => getTopMetrics({ category: "app.foreground", days, limit: 10 }, s), [days]);
  const apps = useResource(loadApps, { resetKey: days });

  const alerts = filterEvents(events.data, FEATURE_EVENT_TYPES.remote);
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, days) : [];
  const detections = metrics.data ? totalFor(metrics.data.categories, ["remote.detected"], "total_count") : 0;
  const installs = alerts.filter((e) => e.type === "software.installed").length;
  const appSeconds = metrics.data ? totalFor(metrics.data.categories, ["app.foreground"], "total_seconds") : 0;

  return (
    <>
      <PageHeader
        title="Application monitoring"
        lede="See which apps your team uses, spot remote-control tools like AnyDesk or TeamViewer, and choose what's allowed."
        actions={<RangeTabs value={days} onChange={setDays} />}
      />

      <StatTiles
        tiles={[
          ...(appsOn
            ? [{ value: metrics.data ? formatHours(appSeconds) : "–", label: "time in apps", icon: "screen" as const, hint: "Time with an app open in front, across your PCs." }]
            : []),
          { value: metrics.data ? String(detections) : "–", label: "remote sessions seen", tone: detections > 0 ? "warn" : "good", icon: "alert", hint: "Times a remote-control tool like AnyDesk ran on a PC." },
          { value: String(installs), label: "software installs", icon: "plus", hint: "New programs installed on your PCs." },
        ]}
      />

      <section className="dash-card" aria-labelledby="remote-alerts-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="remote-alerts-title">
            Remote & software alerts
          </h2>
          <p className="dash-card__sub">Remote-tool detections and new software installs, newest first.</p>
        </div>
        <AlertsTable
          events={alerts}
          limit={10}
          resolveMember={resolveMember}
          now={now}
          caption="Remote-tool and software alerts"
          emptyText="No remote-software alerts. Nothing to action here."
        />
      </section>

      {policy.data ? (
        <RemoteSoftwareCard block={policy.data.remote_software} commit={commit} />
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      {appsOn ? null : (
        <PlanLock module="app_usage" compact title="Most-used apps">
          See which apps your team works in and for how long, per person and across the company.
        </PlanLock>
      )}
      <section className="dash-card" aria-labelledby="apps-top-title" hidden={!appsOn}>
        <div className="dash-card__head dash-card__head--split">
          <div>
            <h2 className="dash-card__title" id="apps-top-title">
              Most-used apps
            </h2>
            <p className="dash-card__sub">The apps open in front across your PCs, by time.</p>
          </div>
        </div>
        {apps.error ? (
          <ErrorState message={errorMessage(apps.error)} onRetry={apps.reload} retrying={apps.pending} />
        ) : (
          <TopUsageTable
            items={apps.data?.items ?? []}
            keyLabel="App"
            loading={apps.data === undefined}
            caption="Top apps by time"
            emptyText="No app usage recorded yet. It appears once a connected PC has been used."
          />
        )}
      </section>

      <section className="dash-card" aria-labelledby="remote-chart-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="remote-chart-title">
            Remote sessions over time
          </h2>
        </div>
        {metrics.data === undefined && metrics.error ? (
          <ErrorState message={errorMessage(metrics.error)} onRetry={metrics.reload} retrying={metrics.pending} />
        ) : (
          <UsageChart
            rows={rows}
            specs={SPECS}
            format={(v) => String(Math.round(v))}
            caption="Times a remote-control tool was detected running"
            loading={metrics.data === undefined}
            emptyHint="No remote-control tools detected yet. Any use shows here while this feature is on."
          />
        )}
      </section>

      <section className="dash-card" aria-labelledby="remote-seen-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="remote-seen-title">
            Software &amp; remote tools seen
          </h2>
          <p className="dash-card__sub">Newly installed software and remote-access tools detected across your PCs.</p>
        </div>
        <div className="dash-twocol">
          <div>
            <h3 className="dash-subhead">Installed software</h3>
            {installsTop.error ? (
              <ErrorState message={errorMessage(installsTop.error)} onRetry={installsTop.reload} retrying={installsTop.pending} />
            ) : (
              <TopUsageTable
                items={installsTop.data?.items ?? []}
                keyLabel="Software"
                metric="count"
                loading={installsTop.data === undefined}
                caption="Newly installed software"
                emptyText="No new installs recorded yet."
              />
            )}
          </div>
          <div>
            <h3 className="dash-subhead">Remote tools</h3>
            {toolsTop.error ? (
              <ErrorState message={errorMessage(toolsTop.error)} onRetry={toolsTop.reload} retrying={toolsTop.pending} />
            ) : (
              <TopUsageTable
                items={toolsTop.data?.items ?? []}
                keyLabel="Tool"
                metric="count"
                loading={toolsTop.data === undefined}
                caption="Remote-access tools detected"
                emptyText="No remote-access tools detected yet."
              />
            )}
          </div>
        </div>
      </section>

      <MetricsDisclosure
        title="What Zinwe shares with you"
        sub="Everything on this page comes from the metrics below. They're visible only to your company's admin."
        collected={APPS_COLLECTED}
        never={APPS_NEVER}
      />
    </>
  );
}
