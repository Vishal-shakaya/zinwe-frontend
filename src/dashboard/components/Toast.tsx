import { useEffect, type ReactElement } from "react";
import { DashIcon } from "./DashIcon";

/**
 * A short confirmation at the bottom of the screen ("Sneha removed. 1 PC slot free."). It disappears
 * on its own after a few seconds; `onDone` clears it.
 */
export function Toast({ message, onDone, ms = 4500 }: { message: string | null; onDone: () => void; ms?: number }): ReactElement | null {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, ms);
    return () => {
      window.clearTimeout(id);
    };
  }, [message, onDone, ms]);

  if (!message) return null;
  return (
    <div className="dash-toast" role="status" aria-live="polite">
      <DashIcon name="check" />
      <span>{message}</span>
      <button type="button" className="dash-toast__x" aria-label="Dismiss" onClick={onDone}>
        <DashIcon name="close" />
      </button>
    </div>
  );
}

export default Toast;
