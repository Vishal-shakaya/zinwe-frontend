import { axisDuration } from "../../lib/format";
import { useCallback, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics, type MetricCategory } from "../../lib/api";
import { cx } from "../../lib/cx";
import { AlertsTable } from "../components/AlertsTable";
import { ScopeBanner, ScopeControls, SectionLabel } from "../components/AnalyticsScope";
import { useAnalyticsScope } from "../features/analyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PagePlanGate, PlanLock } from "../components/PlanLock";
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

// The agent counts each remote-tool sighting as a "remote.tool" metric (keyed by tool); "remote.detected" was never sent.
const REMOTE_SPECS: SeriesSpec[] = [{ category: "remote.tool", field: "count", label: "Remote sessions" }];
const APP_SPECS: SeriesSpec[] = [{ category: "app.foreground", field: "seconds", label: "Time in apps" }];
const TYPES = FEATURE_EVENT_TYPES.remote;

type ChartView = "apps" | "remote";

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

/** One top list, scoped like the rest of the page. */
function useTop(category: MetricCategory, days: number, member: number | null, limit: number) {
  const load = useCallback(
    (s: AbortSignal) => getTopMetrics({ category, days, member: member ?? undefined, limit }, s),
    [category, days, member, limit],
  );
  return useResource(load, { resetKey: `${days}:${member ?? "all"}` });
}

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

/**
 * Tiles → Trends (time in apps / remote sessions) → Alerts → Manage (remote-tool rules) → Details (most-used
 * apps, software and tools seen, what Zinwe shares). The header picks who and when.
 */
function RemotePageContent(): ReactElement {
  const appsOn = useEntitlements().has("app_usage");
  usePageMeta({ title: "Application monitoring — Zinwe", description: "Which apps your team uses, remote-control tools and new software." });

  const scope = useAnalyticsScope();
  const { days, member } = scope;
  const { metrics, events, devices, now, resolveMember } = useFeatureData(days, member, TYPES);
  const { policy, commit } = usePolicy();
  // "Block AnyDesk" from an alert lands here with ?block=AnyDesk (J5-24).
  const [params] = useSearchParams();
  const focusTool = params.get("block")?.trim().slice(0, 80) || undefined;
  const [picked, setPicked] = useState<ChartView>("apps");
  const view: ChartView = appsOn ? picked : "remote";

  const installsTop = useTop("software.installed", days, member, 10);
  const toolsTop = useTop("remote.tool", days, member, 10);
  const apps = useTop("app.foreground", days, member, 10);

  const alerts = filterEvents(events.data, TYPES);
  const specs = view === "apps" ? APP_SPECS : REMOTE_SPECS;
  const rows = metrics.data ? toChartRows(metrics.data.series, specs, days) : [];
  const detections = metrics.data ? totalFor(metrics.data.categories, ["remote.tool"], "total_count") : 0;
  const installs = alerts.filter((e) => e.type === "software.installed").length;
  const appSeconds = metrics.data ? totalFor(metrics.data.categories, ["app.foreground"], "total_seconds") : 0;
  const who = scope.person?.name;

  return (
    <>
      <PageHeader
        title="Application monitoring"
        lede="See which apps your team uses, spot remote-control tools like AnyDesk or TeamViewer, and choose what's allowed."
        actions={<ScopeControls scope={scope} />}
      />
      <ScopeBanner scope={scope} />

      <StatTiles
        tiles={[
          ...(appsOn
            ? [{ value: metrics.data ? formatHours(appSeconds) : "–", label: "time in apps", icon: "screen" as const, hint: "Time with an app open in front, across your PCs." }]
            : []),
          { value: metrics.data ? String(detections) : "–", label: "remote sessions seen", tone: detections > 0 ? "warn" : "good", icon: "alert", hint: "Times a remote-control tool like AnyDesk ran on a PC." },
          { value: events.data ? String(installs) : "–", label: "software installs", icon: "plus", hint: "New programs installed on your PCs." },
        ]}
      />

      <SectionLabel title="Trends" />
      <section className="dash-card" aria-labelledby="remote-chart-title">
        <div className="dash-card__head dash-card__head--split">
          <div>
            <h2 className="dash-card__title" id="remote-chart-title">
              {view === "apps" ? "Time in apps" : "Remote sessions over time"}
            </h2>
            <p className="dash-card__sub">{scope.label}</p>
          </div>
          {appsOn ? (
            <div className="dash-range" role="group" aria-label="Choose a chart">
              {(
                [
                  ["apps", "Time in apps"],
                  ["remote", "Remote sessions"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cx("dash-range__btn", view === value && "is-on")}
                  aria-pressed={view === value}
                  onClick={() => setPicked(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {metrics.data === undefined && metrics.error ? (
          <ErrorState message={errorMessage(metrics.error)} onRetry={metrics.reload} retrying={metrics.pending} />
        ) : view === "apps" ? (
          <UsageChart
            rows={rows}
            specs={specs}
            format={formatHours}
            axisFormat={axisDuration}
            caption="Time with an app open in front, over time"
            loading={metrics.data === undefined}
            emptyHint={who ? `No app usage from ${who} in this range.` : "No app usage recorded yet. It appears once a connected PC has been used."}
          />
        ) : (
          <UsageChart
            rows={rows}
            specs={specs}
            format={(v) => String(Math.round(v))}
            caption="Times a remote-control tool was detected running"
            loading={metrics.data === undefined}
            emptyHint={
              who ? `No remote-control tools seen on ${who}'s PC in this range.` : "No remote-control tools detected yet. Any use shows here while this feature is on."
            }
          />
        )}
      </section>

      <SectionLabel title="Alerts" />
      <section className="dash-card" aria-labelledby="remote-alerts-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="remote-alerts-title">
            Remote &amp; software alerts
          </h2>
          <p className="dash-card__sub">Remote-tool detections and new software installs, newest first.</p>
        </div>
        <AlertsTable
          events={alerts}
          limit={10}
          resolveMember={resolveMember}
          now={now}
          devices={devices.data}
          caption="Remote-tool and software alerts"
          emptyText={who ? `No remote-software alerts from ${who}.` : "No remote-software alerts. Nothing to action here."}
        />
      </section>

      <SectionLabel title="Manage" note="Remote-tool rules apply to every PC in your company." />
      {policy.data ? (
        <RemoteSoftwareCard block={policy.data.remote_software} commit={commit} focusTool={focusTool} />
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      <SectionLabel title="Details" />
      {appsOn ? null : (
        <PlanLock module="app_usage" compact title="Most-used apps">
          See which apps your team works in and for how long, per person and across the company.
        </PlanLock>
      )}
      <section className="dash-card" aria-labelledby="apps-top-title" hidden={!appsOn}>
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="apps-top-title">
            Most-used apps
          </h2>
          <p className="dash-card__sub">The apps open in front, by time · {scope.label}</p>
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

      <section className="dash-card" aria-labelledby="remote-seen-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="remote-seen-title">
            Software &amp; remote tools seen
          </h2>
          <p className="dash-card__sub">Newly installed software and remote-access tools · {scope.label}</p>
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
