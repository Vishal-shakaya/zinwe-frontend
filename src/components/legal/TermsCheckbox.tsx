import { useState, type ReactElement, type Ref } from "react";
import type { LegalDoc } from "../../content/legal";
import { LegalDialog } from "./LegalDialog";
import "./legal.css";

/**
 * A required "I agree to …" checkbox whose policy names open the full text in a
 * dialog; agreeing there ticks the box. Used at sign-up (Terms, Privacy,
 * Acceptable Use) and on every payment form (payment terms).
 */
export function TermsCheckbox({
  id,
  checked,
  onChange,
  docs,
  dialogTitle,
  lead,
  error,
  inputRef,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  docs: readonly LegalDoc[];
  dialogTitle: string;
  /** Text before the links, e.g. "I agree to Zinwe's". */
  lead: string;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
}): ReactElement {
  const [open, setOpen] = useState<number | null>(null);
  const errorId = `${id}-error`;

  return (
    <div className={"terms-check" + (error ? " is-invalid" : "")}>
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
      />
      <label htmlFor={id}>
        {lead}{" "}
        {docs.map((doc, i) => (
          <span key={doc.slug + doc.title}>
            <button type="button" className="terms-check__link" onClick={() => setOpen(i)}>
              {doc.title}
            </button>
            {i < docs.length - 2 ? ", " : i === docs.length - 2 ? " and " : ""}
          </span>
        ))}
        .
      </label>
      {error ? (
        <p className="field__err terms-check__err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <LegalDialog
        open={open !== null}
        docs={open === null ? docs : [...docs.slice(open), ...docs.slice(0, open)]}
        title={dialogTitle}
        onClose={() => setOpen(null)}
        onAgree={() => onChange(true)}
        agreeLabel="I agree"
      />
    </div>
  );
}

export default TermsCheckbox;
