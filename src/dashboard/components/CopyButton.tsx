import { useEffect, useState, type ReactElement } from "react";
import { cx } from "../../lib/cx";
import { copyText } from "../../lib/clipboard";
import { DashIcon } from "./DashIcon";

interface CopyButtonProps {
  text: string;
  /** Visible label, e.g. "Copy key". */
  label?: string;
  /** What is being copied, for screen readers ("enrollment key"). */
  what: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", what, className }: CopyButtonProps): ReactElement {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const id = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [status]);

  const onClick = async () => {
    setStatus((await copyText(text)) ? "copied" : "failed");
  };

  return (
    <button
      type="button"
      className={cx("btn btn--ghost dash-btn-sm", status === "copied" && "is-copied", className)}
      onClick={onClick}
      aria-label={`${label}: ${what}`}
    >
      <DashIcon name={status === "copied" ? "check" : "copy"} />
      <span aria-live="polite">
        {status === "copied" ? "Copied" : status === "failed" ? "Select and copy it instead" : label}
      </span>
    </button>
  );
}
