import { useCallback, useState, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getTopMetrics } from "../../lib/api";
import { AlertsTable } from "../components/AlertsTable";
import { MetricsDisclosure } from "../components/MetricsDisclosure";
import { RangeTabs } from "../components/RangeTabs";
import { StatTiles } from "../components/StatTiles";
import { ErrorState, PageHeader } from "../components/States";
import { TopUsageTable } from "../components/TopUsageTable";
import { UsageChart } from "../components/UsageChart";
import { FEATURE_EVENT_TYPES } from "../features/events";
import { formatBytes, toChartRows, totalFor, type SeriesSpec } from "../features/metrics";
import { DataTransferCard, UsbCard } from "../features/policyControls";
import { filterEvents, useFeatureData } from "../features/useFeatureData";
import { usePolicy } from "../features/usePolicy";
import { useResource } from "../useResource";

const DATA_COLLECTED = [
  { label: "USB copies", detail: "When files are copied to a pen drive — how many and the total size, plus which drive." },
  { label: "Network-share copies", detail: "Files copied to another PC or shared folder — count, size and the destination." },
  { label: "Email attachments", detail: "Attachments sent from classic desktop Outlook — count and total size." },
  { label: "Web uploads", detail: "Data sent to websites and webmail (Gmail, New Outlook, Drive…) by domain and size — when upload monitoring is on." },
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

export default function DataPage(): ReactElement {
  usePageMeta({ title: "Data safety — Zinwe", description: "Where data is going, large-transfer alerts, and USB controls." });

  const [days, setDays] = useState(7);
  const { metrics, events, now, resolveMember } = useFeatureData(days);
  const { policy, commit } = usePolicy();

  const loadUsb = useCallback((s: AbortSignal) => getTopMetrics({ category: "transfer.usb", days, limit: 8 }, s), [days]);
  const usbTop = useResource(loadUsb, { resetKey: days });
  const loadLan = useCallback((s: AbortSignal) => getTopMetrics({ category: "transfer.lan", days, limit: 8 }, s), [days]);
  const lanTop = useResource(loadLan, { resetKey: days });
  const loadUploads = useCallback((s: AbortSignal) => getTopMetrics({ category: "net.upload", days, limit: 10 }, s), [days]);
  const uploads = useResource(loadUploads, { resetKey: days });

  const alerts = filterEvents(events.data, FEATURE_EVENT_TYPES.data);
  const rows = metrics.data ? toChartRows(metrics.data.series, SPECS, days) : [];
  const totalBytes = metrics.data ? totalFor(metrics.data.categories, TRANSFER_CATEGORIES, "total_bytes") : 0;
  const usbBytes = metrics.data ? totalFor(metrics.data.categories, ["transfer.usb"], "total_bytes") : 0;

  return (
    <>
      <PageHeader
        title="Data safety"
        lede="See where data leaves your PCs, get flagged on large transfers, and control USB drives — all in one place."
      />

      <StatTiles
        tiles={[
          { value: metrics.data ? formatBytes(totalBytes) : "–", label: "data moved out", icon: "share", hint: "Copied to USB drives, shared folders and email, over the chosen range." },
          { value: metrics.data ? formatBytes(usbBytes) : "–", label: "copied to USB", icon: "usb", hint: "Data copied onto pen drives and other USB storage." },
          { value: String(alerts.length), label: "data alerts", tone: alerts.length > 0 ? "warn" : "good", icon: "alert", hint: "Large copies, blocked USB drives and other data warnings." },
        ]}
      />

      <section className="dash-card" aria-labelledby="data-alerts-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-alerts-title">
            Data alerts
          </h2>
          <p className="dash-card__sub">Large copies and USB activity worth a look, newest first.</p>
        </div>
        <AlertsTable
          events={alerts}
          limit={10}
          resolveMember={resolveMember}
          now={now}
          caption="Data-transfer and USB alerts"
          emptyText="No data alerts. Nothing to action here."
        />
      </section>

      {policy.data ? (
        <>
          <UsbCard block={policy.data.usb} commit={commit} />
          <DataTransferCard block={policy.data.data_transfer} commit={commit} />
        </>
      ) : policy.error ? (
        <section className="dash-card">
          <ErrorState message={errorMessage(policy.error)} onRetry={policy.reload} retrying={policy.pending} />
        </section>
      ) : null}

      <section className="dash-card" aria-labelledby="data-chart-title">
        <div className="dash-card__head dash-card__head--split">
          <h2 className="dash-card__title" id="data-chart-title">
            Where data is going
          </h2>
          <RangeTabs value={days} onChange={setDays} />
        </div>
        {metrics.data === undefined && metrics.error ? (
          <ErrorState message={errorMessage(metrics.error)} onRetry={metrics.reload} retrying={metrics.pending} />
        ) : (
          <UsageChart
            rows={rows}
            specs={SPECS}
            format={formatBytes}
            caption="Data leaving your PCs over time, by route"
            loading={metrics.data === undefined}
            emptyHint="No transfers recorded yet. USB, network and email transfers appear here once they happen."
          />
        )}
      </section>

      <section className="dash-card" aria-labelledby="data-top-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-top-title">
            Biggest destinations
          </h2>
          <p className="dash-card__sub">Where the most data went by size, over the chosen range.</p>
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
          <div>
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

      <section className="dash-card" aria-labelledby="data-uploads-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="data-uploads-title">
            Uploads to the web
          </h2>
          <p className="dash-card__sub">
            Data sent to websites and webmail (Gmail, New Outlook, Drive…) by destination domain — sizes only.
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
            emptyText="No web uploads recorded yet. Upload monitoring is off by default — turn it on in the agent config (Agent:Features:network) on PCs running the Zinwe service."
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
