import { useCallback, useState, type FormEvent, type ReactElement } from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getPolicy, updatePolicy, type Policy, type UsbMode } from "../../lib/api";
import { cx } from "../../lib/cx";
import { DashIcon } from "../components/DashIcon";
import { ErrorState, LoadingState, PageHeader } from "../components/States";
import { formatDateTime, formatRelative, useNow } from "../time";
import { useResource } from "../useResource";

/** Same labels the backend uses in activity titles ('USB rule "Read-only" is now active…'). */
const USB_OPTIONS: ReadonlyArray<{ mode: UsbMode; label: string; summary: string; detail: string }> = [
  {
    mode: "allow",
    label: "Allow",
    summary: "USB drives work normally.",
    detail: "Zinwe still notes every drive that's plugged in, so you can see it under Activity.",
  },
  {
    mode: "read_only",
    label: "Read-only",
    summary: "People can open files from a USB drive but can't copy anything onto it.",
    detail: "Stops company files leaving on a pen drive, while still letting staff open what they're sent.",
  },
  {
    mode: "block",
    label: "Block",
    summary: "USB drives don't open at all.",
    detail: "The strictest setting. Each attempt to use a drive shows up under Activity.",
  },
];

function labelFor(mode: UsbMode): string {
  return USB_OPTIONS.find((o) => o.mode === mode)?.label ?? mode;
}

export default function RulesPage(): ReactElement {
  usePageMeta({ title: "Rules — Zinwe", description: "Choose what your PCs allow." });

  const loadPolicy = useCallback((signal: AbortSignal) => getPolicy(signal), []);
  const policy = useResource<Policy>(loadPolicy);
  // Lives here, not in the form: the form remounts when the version changes.
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        title="Rules"
        lede="Choose what every PC on your account allows. One setting covers all of them."
      />

      {policy.data === undefined ? (
        <section className="dash-card">
          {policy.error ? (
            <ErrorState
              title="We couldn't load your rules"
              message={errorMessage(policy.error)}
              onRetry={policy.reload}
              retrying={policy.pending}
            />
          ) : (
            <LoadingState label="Loading your rules…" rows={3} />
          )}
        </section>
      ) : (
        // Keyed by version so a save (or a change from another tab) resets the picker.
        <UsbRuleForm
          key={policy.data.version}
          policy={policy.data}
          justSaved={savedVersion === policy.data.version}
          onSaved={(next) => {
            setSavedVersion(next.version);
            policy.setData(next);
          }}
        />
      )}
    </>
  );
}

interface UsbRuleFormProps {
  policy: Policy;
  /** The owner saved this exact version a moment ago. */
  justSaved: boolean;
  onSaved: (policy: Policy) => void;
}

function UsbRuleForm({ policy, justSaved, onSaved }: UsbRuleFormProps): ReactElement {
  const now = useNow();
  const [selected, setSelected] = useState<UsbMode>(policy.usb.mode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const dirty = selected !== policy.usb.mode;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await updatePolicy(selected));
      setTouched(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="dash-card" onSubmit={onSubmit} aria-labelledby="usb-title">
      <div className="dash-card__head dash-card__head--row">
        <span className="dash-card__ico" aria-hidden="true">
          <DashIcon name="usb" />
        </span>
        <div>
          <h2 className="dash-card__title" id="usb-title">
            USB drives
          </h2>
          <p className="dash-card__sub">Pen drives and external hard disks. Keyboards, mice and chargers are never affected.</p>
        </div>
      </div>

      <fieldset className="dash-choices" disabled={saving}>
        <legend className="dash-sr">What should PCs do with USB drives?</legend>
        {USB_OPTIONS.map((option) => {
          const checked = selected === option.mode;
          const current = policy.usb.mode === option.mode;
          return (
            <label key={option.mode} className={cx("dash-choice", checked && "is-on")}>
              <input
                type="radio"
                name="usb-mode"
                value={option.mode}
                checked={checked}
                onChange={() => {
                  setSelected(option.mode);
                  setTouched(true);
                  setError(null);
                }}
              />
              <span className="dash-choice__radio" aria-hidden="true" />
              <span className="dash-choice__text">
                <span className="dash-choice__label">
                  {option.label}
                  {current ? <em className="dash-pill">Active now</em> : null}
                </span>
                <span className="dash-choice__summary">{option.summary}</span>
                <span className="dash-choice__detail">{option.detail}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {error ? (
        <p className="form__err" role="alert">
          {error}
        </p>
      ) : null}

      {justSaved && !touched ? (
        <p className="dash-banner dash-banner--ok" role="status">
          <DashIcon name="check" />
          <span>
            Saved. "{labelFor(policy.usb.mode)}" is now the USB rule. PCs pick this up within about a minute.
          </span>
        </p>
      ) : null}

      <div className="dash-savebar">
        <p className="dash-savebar__meta">
          Rule version <b>{policy.version}</b> · changed{" "}
          <span title={formatDateTime(policy.updated_at)}>{formatRelative(policy.updated_at, now)}</span>
          <br />
          PCs pick this up within about a minute, and keep following it even without internet.
        </p>
        <div className="dash-savebar__actions">
          {dirty ? (
            <button
              type="button"
              className="btn btn--ghost dash-btn-sm"
              onClick={() => {
                setSelected(policy.usb.mode);
                setError(null);
              }}
              disabled={saving}
            >
              Undo
            </button>
          ) : null}
          <button
            type="submit"
            className={cx("btn dash-btn-sm", dirty ? "btn--primary" : "btn--ghost")}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : dirty ? `Save: ${labelFor(selected)}` : "No changes to save"}
          </button>
        </div>
      </div>
    </form>
  );
}
