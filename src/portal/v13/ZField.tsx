import type { ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx";

/** AuthFlow `.field`: label + control (+ hint) and the inline error under it. */
export function ZField({
  error,
  errorId,
  children,
}: {
  error?: string;
  /** id for the error (link it from the control's aria-describedby). */
  errorId?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className={cx("zau-field", error && "is-invalid")}>
      {children}
      {error ? (
        <p className="zau-err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
