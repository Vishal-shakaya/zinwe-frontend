import { useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useFloatSlot } from "../float/slots";
import { ICON } from "../ui/icons";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/float.css";

/** CompNotify types: the icon tile is the one touch of colour; Needs you and Error add a black border. */
export type ToastTone = "success" | "info" | "warn" | "need" | "error";

const LOOK: Record<ToastTone, { icon: string; role: "status" | "alert" }> = {
  success: { icon: "M20 6 9 17l-5-5", role: "status" },
  info: { icon: ICON.info, role: "status" },
  warn: { icon: ICON.alerts, role: "status" },
  need: { icon: ICON.clock, role: "alert" },
  error: { icon: "M6 6l12 12M18 6 6 18", role: "alert" },
};

/**
 * A short confirmation (board CompNotify, "Success" by default): white card, 24 px icon tile, the message, a Dismiss
 * button and a thin bar counting down. It sits bottom-right in the floating corner, above the Chat / Support buttons,
 * goes on its own after `ms` (5 s; paused while the pointer is on it); `onDone` clears it. `ms={0}` keeps it until
 * dismissed (Needs you, Error).
 */
export function Toast({
  message,
  onDone,
  ms = 5000,
  tone = "success",
}: {
  message: string | null;
  onDone: () => void;
  ms?: number;
  tone?: ToastTone;
}): ReactElement | null {
  const slot = useFloatSlot("toast");
  if (!message || !slot) return null;
  // A new message starts a fresh countdown.
  return createPortal(<ToastCard key={message} message={message} onDone={onDone} ms={ms} tone={tone} />, slot);
}

function ToastCard({ message, onDone, ms, tone }: { message: string; onDone: () => void; ms: number; tone: ToastTone }): ReactElement {
  const [paused, setPaused] = useState(false);
  const left = useRef(ms);
  const look = LOOK[tone];

  useEffect(() => {
    if (!ms || paused) return;
    const started = Date.now();
    const id = window.setTimeout(onDone, left.current);
    return () => {
      window.clearTimeout(id);
      left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [ms, paused, onDone]);

  return (
    <div
      className={`zf-toast ${tone}`}
      role={look.role}
      aria-live={look.role === "alert" ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="zf-toast__row">
        <span className="zf-toast__ico" aria-hidden="true">
          <ZIcon d={look.icon} size={13} stroke={2.4} />
        </span>
        <b className="zf-toast__txt">{message}</b>
        <button type="button" className="zf-toast__x" aria-label="Dismiss" onClick={onDone}>
          ×
        </button>
      </div>
      {ms ? (
        <span className="zf-toast__bar" aria-hidden="true">
          <span style={{ animationDuration: `${ms}ms`, animationPlayState: paused ? "paused" : "running" }} />
        </span>
      ) : null}
    </div>
  );
}

export default Toast;
