import { useState, type ReactElement, type ReactNode, type Ref } from "react";
import { cx } from "../../lib/cx";

/** Board strength meter: 0 empty, 1 too weak, 2 good, 3 strong. Display only; the rules stay newPasswordError. */
function score(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  if (pw.length < 8 || !/[a-z]/i.test(pw) || !/\d/.test(pw)) return 1;
  return pw.length < 12 ? 2 : 3;
}

const METER_TEXT = [
  "Use 8 or more characters, with letters and numbers.",
  "Too short or missing letters and numbers.",
  "Good. Longer is even better.",
  "Strong password.",
] as const;

interface ZPasswordProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: "new-password" | "current-password";
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
  /** The board's strength line under a new password. */
  meter?: boolean;
  /** Fixed hint under the field (instead of the meter). */
  hint?: string;
  /** Right of the label, e.g. "Forgot password?". */
  aside?: ReactNode;
}

/** AuthFlow password field: Show / Hide inside the input, optional strength line, inline error. */
export function ZPassword({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  inputRef,
  autoFocus,
  disabled,
  meter = false,
  hint,
  aside,
}: ZPasswordProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const s = score(value);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [meter || hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("zau-field", error && "is-invalid")}>
      {aside ? (
        <div className="zau-field__row">
          <label className="zau-lab" htmlFor={id}>
            {label}
          </label>
          {aside}
        </div>
      ) : (
        <label className="zau-lab" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="zau-pw">
        <input
          ref={inputRef}
          id={id}
          name={id}
          className={cx("zau-inp", error && "err")}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="zau-pw__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {meter ? (
        <div className={`zau-meter s${s}`} id={hintId}>
          <span className="zau-meter__bar" aria-hidden="true" />
          {METER_TEXT[s]}
        </div>
      ) : hint ? (
        <span className="zau-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <p className="zau-err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
