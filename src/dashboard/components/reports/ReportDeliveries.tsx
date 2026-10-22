import { useCallback, type ReactElement } from "react";
import { errorMessage, getReportDeliveries, type ReportDeliveryStatus } from "../../../lib/api";
import { formatDate, formatDateTime } from "../../../lib/format";
import { useResource } from "../../useResource";
import { EmptyState, ErrorState, LoadingState, RefreshButton } from "../States";

const STATUS: Record<ReportDeliveryStatus, string> = {
  sent: "Sent",
  partial: "Partly sent",
  failed: "Not sent",
  skipped: "Skipped",
};

/** Reports that went out by email (FR-22): from "Email report" or a schedule, newest first. */
export function ReportDeliveries({ refreshKey }: { refreshKey: number }): ReactElement {
  const load = useCallback((signal: AbortSignal) => getReportDeliveries(signal), []);
  const rows = useResource(load, { resetKey: refreshKey });
  return (
    <section className="dash-card" aria-labelledby="rpt-sent-title">
      <div className="dash-card__head">
        <div>
          <h2 className="dash-card__title" id="rpt-sent-title">
            Sent reports
          </h2>
          <p className="dash-card__sub">The last 50 reports Zinwe emailed for you, and who got them.</p>
        </div>
        <RefreshButton onClick={rows.reload} pending={rows.pending} />
      </div>
      {rows.data === undefined ? (
        rows.error ? (
          <ErrorState message={errorMessage(rows.error)} onRetry={rows.reload} retrying={rows.pending} />
        ) : (
          <LoadingState label="Loading sent reports…" rows={3} />
        )
      ) : rows.data.length === 0 ? (
        <EmptyState icon="mail" title="Nothing sent yet">
          Reports you email, or that a schedule sends, show up here.
        </EmptyState>
      ) : (
        <div className="rpt-scroll">
          <table className="rpt-table rpt-table--sent">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Report</th>
                <th scope="col">Sent to</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((d) => (
                <tr key={d.id}>
                  <th scope="row">
                    {formatDateTime(d.created_at)}
                    <small>{d.schedule ? "Scheduled" : "Sent by you"}</small>
                  </th>
                  <td>
                    {d.member_name ? `${d.member_name}'s report` : "Team report"}
                    <small>
                      {d.period_from === d.period_to
                        ? formatDate(d.period_from)
                        : `${formatDate(d.period_from)} to ${formatDate(d.period_to)}`}
                    </small>
                  </td>
                  <td className="rpt-recips">{d.recipients.length ? d.recipients.join(", ") : "—"}</td>
                  <td>
                    <span className={`rpt-status rpt-status--${d.status}`}>{STATUS[d.status]}</span>
                    <small>{d.detail}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
