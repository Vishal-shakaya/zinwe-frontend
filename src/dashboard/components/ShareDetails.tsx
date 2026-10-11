import { useEffect, useState, type ReactElement } from "react";
import { copyText } from "../../lib/clipboard";
import type { Member } from "../../lib/api";
import { buildInviteText } from "../features/invite";
import { DashIcon } from "./DashIcon";

/** True when the browser can hand text to the OS share sheet (mobile + some desktop). */
function canWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

interface ShareDetailsProps {
  member: Member;
  companyName?: string | null;
  /** Compact look for the per-row actions; omit for the larger created-panel. */
  small?: boolean;
  /** Only the "Share on text" button (the caller offers copying elsewhere). */
  shareOnly?: boolean;
}

/**
 * "Copy details" + "Share" buttons for a member's connect instructions.
 * Share uses the OS share sheet when available, otherwise opens WhatsApp with
 * the text prefilled (the common "share on text" path for our users).
 */
export function ShareDetails({ member, companyName, small, shareOnly }: ShareDetailsProps): ReactElement {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (copied === "idle") return;
    const id = window.setTimeout(() => setCopied("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  const text = buildInviteText(member, companyName);
  const sizeClass = small ? "dash-btn-sm" : "";

  const onCopy = async () => {
    setCopied((await copyText(text)) ? "ok" : "fail");
  };

  const onShare = async () => {
    if (canWebShare()) {
      try {
        await navigator.share({ title: "Connect your PC to Zinwe", text });
        return;
      } catch {
        // User dismissed the sheet, or it's unavailable — fall through to WhatsApp.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {shareOnly ? null : (
        <button
          type="button"
          className={`btn btn--ghost ${sizeClass} ${copied === "ok" ? "is-copied" : ""}`.trim()}
          onClick={onCopy}
          aria-label={`Copy connect details for ${member.name}`}
        >
          <DashIcon name={copied === "ok" ? "check" : "copy"} />
          <span aria-live="polite">
            {copied === "ok" ? "Copied" : copied === "fail" ? "Select and copy instead" : "Copy details"}
          </span>
        </button>
      )}
      <button
        type="button"
        className={`btn btn--ghost ${sizeClass}`.trim()}
        onClick={onShare}
        aria-label={`Share connect details for ${member.name}`}
      >
        <DashIcon name="share" />
        Share on text
      </button>
    </>
  );
}
