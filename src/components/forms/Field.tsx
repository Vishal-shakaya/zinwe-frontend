import type { ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx";

interface FieldProps {
  /** Span both grid columns (`.field--full`). */
  full?: boolean;
  /** Inline error; when set the field turns red and the message shows below. */
  error?: string;
  children: ReactNode;
}

/** `.field` wrapper: label + control + inline error, shared by client and server validation. */
export function Field({ full = false, error, children }: FieldProps): ReactElement {
  return (
    <div className={cx("field", full && "field--full", error && "is-invalid")}>
      {children}
      {error ? (
        <p className="field__err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
