import { useCallback, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics, type MetricCategory } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { ScopeBanner, ScopeControls, SectionLabel } from "../components/AnalyticsScope";
import { useAnalyticsScope } from "../features/analyticsScope";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { PlanLock } from "../components/PlanLock";
import { StatTiles } from "../components/StatTiles";
import { ErrorState, PageHeader } from "../components/States";
import { TopUsageTable } from "../components/TopUsageTable";
import { UsageChart } from "../components/UsageChart";
import { useEntitlements } from "../features/entitlements";
import { FEATURE_EVENT_TYPES } from "../features/events";
import { formatAxisBytes, formatBytes, toChartRows, totalFor, type SeriesSpec } from "../features/metrics";
import { DataTransferCard, UsbCard } from "../features/policyControls";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { useResource } from "../useResource";

const DATA_COLLECTED = [
  { label: "USB copies", detail: "When files are copied to a pen drive — how many and the total size, plus which drive." },
  { label: "Network-share copies", detail: "Files copied to another PC or shared folder — count, size and the destination." },
  { label: "Email attachments", detail: "Attachments sent from classic desktop Outlook — count and total size." },
  { label: "Web uploads", detail: "Data sent to websites and webmail (Gmail, New Outlook, Drive…) by domain and size — coming soon." },
  { label: "USB rule in force", detail: "Whether USB drives are allowed, read-only, or blocked on each PC." },
];
const DATA_NEVER = [
  "The contents of any file copied or sent",
  "Keystrokes or screenshots",
  "File names or email subjects (unless you turn that on below)",
  "Personal drives of people outside your team",
];

const SPECS: SeriesSpec[] = [
  { category: "transfer.usb", field: "bytes", label: "To USB" },
  { category: "transfer.lan", field: "bytes", label: "To network share" },
  { category: "transfer.email", field: "bytes", label: "By email" },
];

const TRANSFER_CATEGORIES = ["transfer.usb", "transfer.lan", "transfer.email"];
const TYPES = FEATURE_EVENT_TYPES.data;

/** One "top destinations" list, scoped like the rest of the page. */
function useTop(category: MetricCategory, days: number, member: number | null, limit: number) {
  const load = useCallback(
    (s: AbortSignal) => getTopMetrics({ category, days, member: member ?? undefined, limit }, s),
    [category, days, member, limit],
  );
  return useResource(load, { resetKey: `${days}:${member ?? "all"}` });
}

/**
 * USB drive and file-copy alerts are on every plan. Plan enforcement: blocking USB drives
 * (usb_control) and files leaving by network, Outlook or upload (data_transfer) are Startups.
 *
 * Tiles → Trends (where data is going) → Alerts → Manage (USB + transfer rules, or what the plan
 * unlocks) → Details (biggest destinations, web uploads, what Zinwe shares). The header picks who and when.
 */
export default function DataPage(): ReactElement {
  const { has } = useEntitlements();
  const usbControl = has("usb_control");
  const transfersOn = has("data_transfer");
  usePageMeta({ title: "Data safety — Zinwe", description: "Where data is going, large-transfer alerts, and USB controls." });

  const scope = useAnalyticsScope();
  const { days, member } = scope;
  const { metrics, events, devices, now, resolveMember } = useFeatureData(days, member, TYPES);
  const { policy, commit } = usePolicy();

  const usbTop = useTop("transfer.usb", days, member, 8);
  const lanTop = useTop("transfer.lan", days, member, 8);
  const uploads = useTop("net.upload", days, member, 10);

  const alerts = filterEvents(events.data, TYPES);
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, days) : [];
  const totalBytes = metrics.data ? totalFor(metrics.data.categories, TRANSFER_CATEGORIES, "total_bytes") : 0;
  const usbBytes = metrics.data ? totalFor(metrics.data.categories, ["transfer.usb"], "total_bytes") : 0;

  return (
    <>
      <PageHeader
        title="Data safety"
        lede="See where data leaves your PCs, get flagged on large transfers, and control USB drives — all in one place."
        actions={<ScopeControls scope={scope} />}
      />
      <ScopeBanner scope={scope} />

      <StatTiles
        tiles={[
          { value: metrics.data ? formatBytes(totalBytes) : "–", label: "data moved out", icon: "share", hint: "Copied to USB drives, shared folders and email, over the chosen range." },
          { value: metrics.data ? formatBytes(usbBytes) : "–", label: "copied to USB", icon: "usb", hint: "Data copied onto pen drives and other USB storage." },
          { value: events.data ? String(alerts.length) : "–", label: "data alerts", tone: alerts.length > 0 ? "warn" : "good", icon: "alert", hint: "Large copies, blocked USB drives and other data warnings." },
        ]}
      />

      <SectionLabel title="Trends" />
      <section className="dash-card" aria-labelledby="data-chart-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-chart-title">
            Where data is going
          </h2>
          <p className="dash-card__sub">{scope.label}</p>
        </div>
        {metrics.data === undefined && metrics.error ? (
          <ErrorState message={errorMessage(metrics.error)} onRetry={metrics.reload} retrying={metrics.pending} />
        ) : (
          <UsageChart
            rows={rows}
            specs={SPECS}
            format={formatBytes}
            axisFormat={formatAxisBytes}
            caption="Data leaving your PCs over time, by route"
            loading={metrics.data === undefined}
            emptyHint={
              scope.person
                ? `No transfers from ${scope.person.name} in this range.`
                : "No transfers recorded yet. USB, network and email transfers appear here once they happen."
            }
          />
        )}
      </section>

      <SectionLabel title="Alerts" />
      <section className="dash-card" aria-labelledby="data-alerts-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-alerts-title">
            Data alerts
          </h2>
          <p className="dash-card__sub">
            Large copies, USB switched to read-only and other USB activity worth a look, newest first.
          </p>
        </div>
        <AlertsTable
          events={alerts}
          limit={10}
          resolveMember={resolveMember}
          now={now}
          devices={devices.data}
          onDevicesChanged={devices.reload}
          caption="Data-transfer and USB alerts"
          emptyText={scope.person ? `No data alerts from ${scope.person.name}.` : "No data alerts. Nothing to action here."}
        />
      </section>

      <SectionLabel title="Manage" note="USB and transfer rules apply to every PC in your company." />
      {!usbControl ? (
        <PlanLock module="usb_control" compact title="Block USB drives">
          Make pen drives read-only or block them completely on every PC, and lock a PC's USB ports after a large copy.
        </PlanLock>
      ) : null}
      {!transfersOn ? (
        <PlanLock module="data_transfer" compact title="Files leaving by network, Outlook or upload">
          Get flagged when large amounts of data go to another PC or shared folder, leave as Outlook attachments, or are
          uploaded to websites and webmail.
        </PlanLock>
      ) : null}
      {policy.data ? (
        <>
          {usbControl ? <UsbCard block={policy.data.usb} commit={commit} /> : null}
          {transfersOn ? <DataTransferCard block={policy.data.data_transfer} commit={commit} /> : null}
        </>
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      <SectionLabel title="Details" />
      <section className="dash-card" aria-labelledby="data-top-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-top-title">
            Biggest destinations
          </h2>
          <p className="dash-card__sub">Where the most data went by size · {scope.label}</p>
        </div>
        <div className="dash-twocol">
          <div>
            <h3 className="dash-subhead">USB drives</h3>
            {usbTop.error ? (
              <ErrorState message={errorMessage(usbTop.error)} onRetry={usbTop.reload} retrying={usbTop.pending} />
            ) : (
              <TopUsageTable
                items={usbTop.data?.items ?? []}
                keyLabel="USB drive"
                metric="bytes"
                showCount
                countLabel="Files"
                loading={usbTop.data === undefined}
                caption="Top USB drives by data copied"
                emptyText="No USB copies recorded yet."
              />
            )}
          </div>
          <div hidden={!transfersOn}>
            <h3 className="dash-subhead">Network shares</h3>
            {lanTop.error ? (
              <ErrorState message={errorMessage(lanTop.error)} onRetry={lanTop.reload} retrying={lanTop.pending} />
            ) : (
              <TopUsageTable
                items={lanTop.data?.items ?? []}
                keyLabel="Share"
                metric="bytes"
                showCount
                countLabel="Files"
                loading={lanTop.data === undefined}
                caption="Top network shares by data copied"
                emptyText="No network-share copies recorded yet."
              />
            )}
          </div>
        </div>
      </section>

      <section className="dash-card" aria-labelledby="data-uploads-title" hidden={!transfersOn}>
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-uploads-title">
            Uploads to the web
          </h2>
          <p className="dash-card__sub">
            Data sent to websites and webmail (Gmail, New Outlook, Drive…) by destination — sizes only · {scope.label}
          </p>
        </div>
        {uploads.error ? (
          <ErrorState message={errorMessage(uploads.error)} onRetry={uploads.reload} retrying={uploads.pending} />
        ) : (
          <TopUsageTable
            items={uploads.data?.items ?? []}
            keyLabel="Site"
            metric="bytes"
            loading={uploads.data === undefined}
            caption="Top sites by data uploaded"
            emptyText="No web uploads recorded yet. Tracking uploads to websites and webmail is coming soon for every PC."
          />
        )}
      </section>

      <MetricsDisclosure
        title="What Zinwe shares with you"
        sub="Everything on this page comes from the metrics below — counts and sizes only, visible just to your company's admin."
        collected={DATA_COLLECTED}
        never={DATA_NEVER}
      />
    </>
  );
}
