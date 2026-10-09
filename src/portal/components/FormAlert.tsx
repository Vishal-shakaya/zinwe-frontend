import type { ReactElement, ReactNode } from "react";

/**
 * Form-level message slot. The live region is always in the DOM, so screen
 * readers announce a message the moment it appears.
 */
export function FormAlert({ message, id }: { message: ReactNode | null; id?: string }): ReactElement {
  return (
    <div className="auth-alert" aria-live="assertive" id={id}>
      {message ? <p className="form__err">{message}</p> : null}
    </div>
  );
}

/** Polite success/info message slot (e.g. "A new code is on its way."). */
export function FormStatus({ message }: { message: ReactNode | null }): ReactElement {
  return (
    <div className="auth-alert" aria-live="polite">
      {message ? <p className="auth-ok">{message}</p> : null}
    </div>
  );
}
