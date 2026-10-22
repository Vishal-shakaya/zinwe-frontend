import { useState, type ReactElement } from "react";
import { errorMessage, sendReport, type ReportDelivery } from "../../../lib/api";
import { badEmail, parseEmails } from "../../features/reportFormat";
import { Modal } from "../Modal";
import { RecipientFields, type Recipients } from "./RecipientFields";

/**
 * "Email report" (FR-22): the report on screen (team or one person, this period) goes out now as a PDF. The
 * owner, each person their own report, and up to five other addresses.
 */
export function ShareReportDialog({
  open,
  onClose,
  onSent,
  onSchedule,
  from,
  to,
  title,
  period,
  memberId,
  personName,
  ownerEmail,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (delivery: ReportDelivery) => void;
  /** "Send this every week instead": opens the schedule form for the same report. */
  onSchedule: () => void;
  from: string;
  to: string;
  title: string;
  period: string;
  memberId: number | null;
  personName: string | null;
  ownerEmail: string;
}): ReactElement {
  const [value, setValue] = useState<Recipients>({ toOwner: true, toMembers: false, extra: "", csv: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const emails = parseEmails(value.extra);
    const bad = badEmail(emails);
    if (bad) return setError(`"${bad}" doesn't look like an email address.`);
    if (emails.length > 5) return setError("Add up to 5 other addresses.");
    if (!value.toOwner && !value.toMembers && emails.length === 0) return setError("Choose who gets the report.");
    setBusy(true);
    setError(null);
    try {
      const delivery = await sendReport({
        from,
        to,
        member: memberId,
        send_to_owner: value.toOwner,
        send_to_members: value.toMembers,
        emails,
        include_csv: value.csv,
      });
      onSent(delivery);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={personName ? `Email ${personName}'s report` : `Email the ${title.toLowerCase()}`} sub={period}>
      <form
        className="co-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <RecipientFields value={value} onChange={setValue} ownerEmail={ownerEmail} personName={personName} idPrefix="rpt-share" />
        {error ? (
          <p className="form__err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dash-confirm__actions">
          <button type="submit" className="btn btn--primary dash-btn-sm" disabled={busy}>
            {busy ? "Sending…" : "Send report"}
          </button>
          <button type="button" className="btn btn--ghost dash-btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="dash-link rpt-schedule-link" onClick={onSchedule} disabled={busy}>
            Send it on a schedule instead
          </button>
        </div>
      </form>
    </Modal>
  );
}
