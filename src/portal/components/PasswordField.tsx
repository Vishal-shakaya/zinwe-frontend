import { useState, type ReactElement, type Ref } from "react";
import { cx } from "../../lib/cx";
import { PASSWORD_HINT } from "../../lib/validation";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** "new-password" shows the rules hint; "current-password" doesn't. */
  autoComplete: "new-password" | "current-password";
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** Password input with a show/hide toggle and, for new passwords, the rules hint. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  inputRef,
  autoFocus,
  disabled,
}: PasswordFieldProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const showHint = autoComplete === "new-password";
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("field", error && "is-invalid")}>
      <label htmlFor={id}>{label}</label>
      <div className="dash-pw">
        <input
          ref={inputRef}
          id={id}
          name={id}
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
          className="dash-pw__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showHint ? (
        <p className="field__hint" id={hintId}>
          {PASSWORD_HINT}
        </p>
      ) : null}
      {error ? (
        <p className="field__err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
