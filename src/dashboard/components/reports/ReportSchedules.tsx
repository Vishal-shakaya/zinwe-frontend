import { useCallback, useState, type ReactElement } from "react";
import {
  deleteReportSchedule,
  errorMessage,
  getReportSchedules,
  sendReportScheduleNow,
  updateReportSchedule,
  type Member,
  type ReportSchedule,
} from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { formatDateTime } from "../../../lib/format";
import { useEntitlements } from "../../features/entitlements";
import { useResource } from "../../useResource";
import { DashIcon } from "../DashIcon";
import { PlanLock } from "../PlanLock";
import { EmptyState, ErrorState, LoadingState } from "../States";
import { ScheduleDialog } from "./ScheduleDialog";

function recipientsOf(s: ReportSchedule, ownerEmail: string): string {
  const parts: string[] = [];
  if (s.send_to_owner) parts.push(`you (${ownerEmail})`);
  if (s.send_to_members) parts.push(s.member_name ? s.member_name : "each person, their own report");
  parts.push(...s.extra_emails);
  return parts.join(", ");
}

/**
 * Scheduled reports (FR-22): each one says when it goes and to whom, with pause / resume, change, "Send now"
 * (to try it) and remove. New ones need reports_pro; a schedule kept after a downgrade shows "Paused".
 */
export function ReportSchedules({
  members,
  ownerEmail,
  onToast,
  openNew,
  onNewHandled,
  seedMember,
}: {
  members: Member[];
  ownerEmail: string;
  onToast: (message: string) => void;
  /** Open the "Schedule a report" form straight away (from Email report). */
  openNew: boolean;
  onNewHandled: () => void;
  seedMember: number | null;
}): ReactElement {
  const { has } = useEntitlements();
  const allowed = has("reports_pro");
  const load = useCallback((signal: AbortSignal) => getReportSchedules(signal), []);
  const schedules = useResource(load);
  const [editing, setEditing] = useState<ReportSchedule | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogOpen = creating || editing !== null || (openNew && allowed);

  const close = () => {
    setCreating(false);
    setEditing(null);
    onNewHandled();
  };

  const act = async (id: number, run: () => Promise<string>) => {
    setBusyId(id);
    setError(null);
    try {
      onToast(await run());
      schedules.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const list = schedules.data ?? [];

  return (
    <section className="dash-card" aria-labelledby="rpt-sched-title">
      <div className="dash-card__head">
        <div>
          <h2 className="dash-card__title" id="rpt-sched-title">
            Scheduled reports
          </h2>
          <p className="dash-card__sub">Reports Zinwe emails by itself, daily, weekly, monthly or every few days.</p>
        </div>
        {allowed ? (
          <button type="button" className="btn btn--primary dash-btn-sm" onClick={() => setCreating(true)}>
            <DashIcon name="plus" />
            New schedule
          </button>
        ) : null}
      </div>

      {!allowed ? (
        <PlanLock module="reports_pro" compact title="Scheduled reports">
          Get the team report, or each person's own, by email every day, week or month, without opening the dashboard.
        </PlanLock>
      ) : null}

      {error ? (
        <p className="form__err" role="alert">
          {error}
        </p>
      ) : null}

      {schedules.data === undefined ? (
        schedules.error ? (
          <ErrorState message={errorMessage(schedules.error)} onRetry={schedules.reload} retrying={schedules.pending} />
        ) : (
          <LoadingState label="Loading scheduled reports…" rows={2} />
        )
      ) : list.length === 0 ? (
        allowed ? (
          <EmptyState icon="clock" title="No scheduled reports yet">
            For example: the team report every Monday morning for you, and each person's own report at the end of the
            month.
          </EmptyState>
        ) : null
      ) : (
        <ul className="rpt-sched-list">
          {list.map((s) => {
            const paused = !s.is_active;
            const planPaused = s.is_active && !allowed;
            return (
              <li key={s.id} className={cx("rpt-sched", (paused || planPaused) && "is-paused")}>
                <div className="rpt-sched__main">
                  <p className="rpt-sched__title">
                    <DashIcon name="file" />
                    {s.member_name ? `${s.member_name}'s report` : "Team report"}
                    {paused ? <span className="rpt-badge">Paused</span> : null}
                    {planPaused ? <span className="rpt-badge rpt-badge--warn">Paused by plan</span> : null}
                  </p>
                  <p className="rpt-sched__when">{s.description}</p>
                  <p className="rpt-sched__to">
                    <DashIcon name="mail" />
                    {recipientsOf(s, ownerEmail)}
                    {s.include_csv ? " · PDF + CSV" : " · PDF"}
                  </p>
                  <p className="dash-note">
                    {s.is_active && s.next_run_at && allowed ? `Next: ${formatDateTime(s.next_run_at)}. ` : ""}
                    {s.last_sent_at ? `Last sent ${formatDateTime(s.last_sent_at)}. ` : ""}
                    {s.last_status}
                  </p>
                </div>
                <div className="rpt-sched__actions">
                  {allowed ? (
                    <button
                      type="button"
                      className="btn btn--ghost dash-btn-sm"
                      disabled={busyId === s.id}
                      onClick={() =>
                        void act(s.id, async () => {
                          const d = await sendReportScheduleNow(s.id);
                          return d.status === "skipped" ? d.detail : `Report sent. ${d.detail}`;
                        })
                      }
                    >
                      <DashIcon name="send" />
                      Send now
                    </button>
                  ) : null}
                  {allowed ? (
                    <button type="button" className="btn btn--ghost dash-btn-sm" onClick={() => setEditing(s)}>
                      Change
                    </button>
                  ) : null}
                  {allowed || s.is_active ? (
                    <button
                      type="button"
                      className="btn btn--ghost dash-btn-sm"
                      disabled={busyId === s.id}
                      onClick={() =>
                        void act(s.id, async () => {
                          await updateReportSchedule(s.id, { is_active: !s.is_active });
                          return s.is_active ? "Schedule paused." : "Schedule resumed.";
                        })
                      }
                    >
                      {s.is_active ? "Pause" : "Resume"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--ghost dash-btn-sm rpt-danger"
                    disabled={busyId === s.id}
                    onClick={() => {
                      if (window.confirm("Remove this scheduled report? Reports already sent stay in Sent.")) {
                        void act(s.id, async () => {
                          await deleteReportSchedule(s.id);
                          return "Scheduled report removed.";
                        });
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialogOpen ? (
        <ScheduleDialog
          open
          onClose={close}
          onSaved={(saved) => {
            close();
            schedules.reload();
            onToast(editing ? "Schedule saved." : `Scheduled. ${saved.description}.`);
          }}
          editing={editing}
          seed={{ member: seedMember }}
          members={members}
          ownerEmail={ownerEmail}
        />
      ) : null}
    </section>
  );
}
