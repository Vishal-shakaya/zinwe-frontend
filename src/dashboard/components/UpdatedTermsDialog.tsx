import { useState, type FormEvent, type ReactElement } from "react";
import { TermsCheckbox } from "../../components/legal/TermsCheckbox";
import { LEGAL_UPDATED, SIGNUP_DOCS } from "../../content/legal";
import { acceptTerms } from "../../lib/api";
import { Spinner } from "../ui/States";
import { Modal } from "./Modal";

/**
 * Asked once when the owner hasn't accepted the current Terms (they signed up before
 * the checkbox existed, or the Terms changed since). Required to keep using the dashboard:
 * the only other way out is signing out.
 */
export function UpdatedTermsDialog({
  firstTime,
  onAccepted,
  onSignOut,
}: {
  /** True when they never accepted any version (signed up before the checkbox). */
  firstTime: boolean;
  onAccepted: () => Promise<unknown>;
  onSignOut: () => void;
}): ReactElement {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!checked) {
      setError("Tick the box to accept the Terms and continue.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await acceptTerms();
      await onAccepted();
    } catch {
      setError("We couldn't save that just now. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => undefined}
      dismissible={false}
      size="sm"
      title={firstTime ? "Please accept our Terms" : "We've updated our Terms"}
      sub={`Updated ${LEGAL_UPDATED}`}
    >
      <form className="terms-prompt zn-terms" onSubmit={onSubmit} noValidate>
        <p className="dash-modal__text">
          {firstTime
            ? "Zinwe now asks every account to accept its Terms and Conditions, Privacy Policy and Acceptable Use Policy. Please read and accept them to keep using your dashboard."
            : "Our Terms now describe the current plans (Free forever, Startups and Businesses, priced by the number of PCs) and how monthly billing and renewals work. Please read and accept them to keep using your dashboard."}
        </p>
        <TermsCheckbox
          id="updated-terms"
          checked={checked}
          onChange={(value) => {
            setChecked(value);
            if (value) setError(undefined);
          }}
          docs={SIGNUP_DOCS}
          dialogTitle="Zinwe's terms"
          lead="I've read and agree to Zinwe's"
          error={error}
          disabled={busy}
        />
        <div className="zn-sheet-acts">
          <button type="button" className="z-btn" onClick={onSignOut} disabled={busy}>
            Sign out
          </button>
          <button type="submit" className="z-btn pri" disabled={busy}>
            {busy ? <Spinner size={16} tone="on-orange" /> : null}
            {busy ? "Saving…" : "Accept and continue"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
