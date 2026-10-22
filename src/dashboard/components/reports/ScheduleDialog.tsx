import { useState, type ReactElement } from "react";
import {
  createReportSchedule,
  errorMessage,
  updateReportSchedule,
  type Member,
  type ReportFrequency,
  type ReportSchedule,
} from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { badEmail, hourLabel, parseEmails, WEEKDAYS } from "../../features/reportFormat";
import { Modal } from "../Modal";
import { RecipientFields, type Recipients } from "./RecipientFields";

const FREQUENCIES: ReadonlyArray<{ key: ReportFrequency; label: string; covers: string }> = [
  { key: "daily", label: "Daily", covers: "the day before" },
  { key: "weekly", label: "Weekly", covers: "last Monday to Sunday" },
  { key: "monthly", label: "Monthly", covers: "the whole of last month" },
  { key: "custom", label: "Every few days", covers: "the days since the last one" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export interface ScheduleDraftSeed {
  member: number | null;
}

/**
 * New / edit a scheduled report (FR-22): about whom (the team or one person), how often (daily, weekly on a
 * day, monthly on a date, or every N days), around what time, and who gets it.
 */
export function ScheduleDialog({
  open,
  onClose,
  onSaved,
  editing,
  seed,
  members,
  ownerEmail,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (schedule: ReportSchedule) => void;
  /** The schedule being changed; null for a new one. */
  editing: ReportSchedule | null;
  seed: ScheduleDraftSeed;
  members: Member[];
  ownerEmail: string;
}): ReactElement {
  const [member, setMember] = useState<number | null>(editing ? editing.member : seed.member);
  const [frequency, setFrequency] = useState<ReportFrequency>(editing?.frequency ?? "weekly");
  const [weekday, setWeekday] = useState(editing?.weekday ?? 0);
  const [monthDay, setMonthDay] = useState(editing?.month_day ?? 1);
  const [everyDays, setEveryDays] = useState(String(editing?.every_days ?? 14));
  const [hour, setHour] = useState(editing?.send_hour ?? 9);
  const [recipients, setRecipients] = useState<Recipients>({
    toOwner: editing?.send_to_owner ?? true,
    toMembers: editing?.send_to_members ?? false,
    extra: (editing?.extra_emails ?? []).join(", "),
    csv: editing?.include_csv ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const person = members.find((m) => m.id === member) ?? null;

  const save = async () => {
    const emails = parseEmails(recipients.extra);
    const bad = badEmail(emails);
    if (bad) return setError(`"${bad}" doesn't look like an email address.`);
    if (emails.length > 5) return setError("Add up to 5 other addresses.");
    if (!recipients.toOwner && !recipients.toMembers && emails.length === 0) return setError("Choose who gets the report.");
    const every = Number(everyDays);
    if (frequency === "custom" && !(every >= 2 && every <= 90)) return setError("Pick every 2 to 90 days.");
    const input = {
      member,
      frequency,
      weekday,
      month_day: monthDay,
      every_days: frequency === "custom" ? every : (editing?.every_days ?? 14),
      send_hour: hour,
      send_to_owner: recipients.toOwner,
      send_to_members: recipients.toMembers,
      extra_emails: emails,
      include_csv: recipients.csv,
      is_active: editing?.is_active ?? true,
    };
    setBusy(true);
    setError(null);
    try {
      onSaved(editing ? await updateReportSchedule(editing.id, input) : await createReportSchedule(input));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const covers = FREQUENCIES.find((f) => f.key === frequency)?.covers ?? "";

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={editing ? "Change scheduled report" : "Schedule a report"}
      sub="Zinwe emails it as a PDF, so nobody has to remember."
    >
      <form
        className="co-form rpt-sched-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="field">
          <label htmlFor="rpt-sched-who">Report about</label>
          <select id="rpt-sched-who" value={member ?? ""} onChange={(e) => setMember(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Everyone (team report)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="rpt-freq">
          <legend>How often</legend>
          <div className="rpt-period" role="radiogroup" aria-label="How often">
            {FREQUENCIES.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={frequency === f.key}
                className={cx("rpt-chip", frequency === f.key && "is-on")}
                onClick={() => setFrequency(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="dash-note">Each report covers {covers}.</p>
        </fieldset>

        <div className="form__grid">
          {frequency === "weekly" ? (
            <div className="field">
              <label htmlFor="rpt-sched-day">Send on</label>
              <select id="rpt-sched-day" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {frequency === "monthly" ? (
            <div className="field">
              <label htmlFor="rpt-sched-date">Send on day</label>
              <select id="rpt-sched-date" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {frequency === "custom" ? (
            <div className="field">
              <label htmlFor="rpt-sched-every">Every (days)</label>
              <input
                id="rpt-sched-every"
                type="number"
                min={2}
                max={90}
                value={everyDays}
                onChange={(e) => setEveryDays(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="rpt-sched-hour">Around</label>
            <select id="rpt-sched-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <RecipientFields
          value={recipients}
          onChange={setRecipients}
          ownerEmail={ownerEmail}
          personName={person?.name ?? null}
          idPrefix="rpt-sched"
        />

        {error ? (
          <p className="form__err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dash-confirm__actions">
          <button type="submit" className="btn btn--primary dash-btn-sm" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Schedule report"}
          </button>
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
