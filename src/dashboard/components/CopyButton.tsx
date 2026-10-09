import { useEffect, useState, type ReactElement } from "react";
import { cx } from "../../lib/cx";
import { DashIcon } from "./DashIcon";

/** Clipboard API first; the hidden-textarea fallback covers older or non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied: try the fallback below.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

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
