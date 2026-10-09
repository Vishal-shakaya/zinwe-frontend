import type { ReactElement } from "react";

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface ResendButtonProps {
  /** Seconds left in the cooldown; 0 = can resend now. */
  seconds: number;
  pending: boolean;
  onResend: () => void;
}

/** "Resend code" link-button, disabled with a countdown while the cooldown runs. */
export function ResendButton({ seconds, pending, onResend }: ResendButtonProps): ReactElement {
  const waiting = seconds > 0;
  return (
    <button type="button" className="auth-resend" onClick={onResend} disabled={waiting || pending}>
      {pending ? "Sending…" : waiting ? (
        <>
          Resend code in <span className="auth-resend__clock">{clock(seconds)}</span>
        </>
      ) : (
        "Resend code"
      )}
    </button>
  );
}
