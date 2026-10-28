import { useCallback, useState, type ReactElement } from "react";
import {
  downloadReport,
  errorMessage,
  getReportDeliveries,
  getReportSchedules,
  type Member,
  type ReportDelivery,
  type ReportDeliveryStatus,
} from "../../lib/api";
import { EmptyBlock, ErrorBlock, SkRows } from "../ui/States";
import { useResource } from "../useResource";
import { dDM, dStr } from "./dates";
import { scheduleName, whenText } from "./schedule";

const STATUS: Record<Exclude<ReportDeliveryStatus, "sent">, { label: string; cls: string }> = {
  partial: { label: "Partly sent", cls: "amber" },
  failed: { label: "Not sent", cls: "red" },
  skipped: { label: "Skipped", cls: "" },
};

/**
 * Sent (board DashReports `v.sent`): the last reports Zinwe emailed (GET reports/deliveries/), newest first —
 * when, which report, the period it covers, who got it, and the same report again as a PDF.
 */
export function SentTab({
  refreshKey,
  members,
  pro,
  today,
  onLocked,
  onToast,
}: {
  refreshKey: number;
  members: readonly Member[];
  pro: boolean;
  today: string;
  /** PDF is a reports_pro feature. */
  onLocked: () => void;
  onToast: (text: string) => void;
}): ReactElement {
  // Schedule names only label the rows; the list still shows if they can't be read.
  const load = useCallback(
    (signal: AbortSignal) => Promise.all([getReportDeliveries(signal), getReportSchedules(signal).catch(() => [])]),
    [],
  );
  const res = useResource(load, { resetKey: refreshKey });
  const [busy, setBusy] = useState<number | null>(null);

  const name = (d: ReportDelivery): string => {
    const s = d.schedule ? res.data?.[1].find((x) => x.id === d.schedule) : undefined;
    const base = s ? scheduleName({ frequency: s.frequency, member_name: null }) : d.schedule ? "Scheduled report" : "Team report";
    return `${base} · ${d.member_name ?? "Everyone"}`;
  };

  const pdf = async (d: ReportDelivery) => {
    if (!pro) return onLocked();
    const member = d.member_name ? (members.find((m) => m.name === d.member_name)?.id ?? null) : null;
    setBusy(d.id);
    try {
      await downloadReport(d.period_from, d.period_to, member, "pdf");
      onToast(`Downloaded ${name(d)} (${dDM(d.period_from)} to ${dStr(d.period_to)}).pdf`);
    } catch (err) {
      onToast(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const rows = res.data?.[0];
  return (
    <section className="z-card" aria-labelledby="sent-h" style={{ overflow: "hidden" }}>
      <h2 id="sent-h" style={{ margin: 0, fontSize: 17, padding: "16px 16px 8px" }}>
        Sent reports
      </h2>
      {rows === undefined ? (
        res.error ? (
          <div style={{ padding: "0 16px 16px" }}>
            <ErrorBlock message={errorMessage(res.error)} onRetry={res.reload} />
          </div>
        ) : (
          <SkRows label="Loading sent reports…" rows={3} avatar={false} />
        )
      ) : rows.length === 0 ? (
        <div style={{ borderTop: "1px solid #F0EDE6" }}>
          <EmptyBlock icon="mail" title="Nothing sent yet">
            Reports you email, or that a schedule sends, show up here.
          </EmptyBlock>
        </div>
      ) : (
        rows.map((d) => {
          const st = d.status === "sent" ? null : STATUS[d.status];
          return (
            <div key={d.id} className="rp-srow" style={{ gap: "10px 20px" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <b className="rp-num">{whenText(d.created_at, today)}</b>
                <br />
                <span className="rp-k">{name(d)}</span>
              </div>
              <div style={{ flex: "1 1 190px", minWidth: 0 }}>
                <span className="rp-k">Covers</span>
                <br />
                <span className="rp-num" style={{ fontSize: 13 }}>
                  {d.period_from === d.period_to ? dStr(d.period_from) : `${dDM(d.period_from)} to ${dStr(d.period_to)}`}
                </span>
              </div>
              <div style={{ flex: "1.4 1 220px", minWidth: 0 }}>
                <span className="rp-k">To</span>
                <br />
                <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>{d.recipients.length ? d.recipients.join(", ") : "—"}</span>
                {st ? (
                  <>
                    <br />
                    <span className={`z-pill ${st.cls}`} title={d.detail}>
                      {st.label}
                    </span>{" "}
                    <span className="rp-k">{d.detail}</span>
                  </>
                ) : null}
              </div>
              <button type="button" className="z-btn sm" disabled={busy === d.id} onClick={() => void pdf(d)}>
                {busy === d.id ? "Preparing…" : "PDF"}
              </button>
            </div>
          );
        })
      )}
    </section>
  );
}
