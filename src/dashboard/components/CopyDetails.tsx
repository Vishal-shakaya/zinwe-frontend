import { useEffect, useState, type ReactElement } from "react";
import { copyText } from "../../lib/clipboard";
import type { Member } from "../../lib/api";
import { buildInviteText } from "../features/invite";
import { DashIcon } from "./DashIcon";

interface CopyDetailsProps {
  member: Member;
  companyName?: string | null;
  /** Compact look for the per-row actions; omit for the larger created-panel. */
  small?: boolean;
}

/**
 * "Copy details": a member's connect instructions (download link, email, ID) to paste anywhere. The old
 * "Share on text" button is gone (FR-11): the details are emailed to them, and copying covers the rest.
 */
export function CopyDetails({ member, companyName, small }: CopyDetailsProps): ReactElement {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (copied === "idle") return;
    const id = window.setTimeout(() => setCopied("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onCopy = async () => {
    setCopied((await copyText(buildInviteText(member, companyName))) ? "ok" : "fail");
  };

  return (
    <button
      type="button"
      className={`btn btn--ghost ${small ? "dash-btn-sm" : ""} ${copied === "ok" ? "is-copied" : ""}`.trim()}
      onClick={onCopy}
      aria-label={`Copy connect details for ${member.name}`}
    >
      <DashIcon name={copied === "ok" ? "check" : "copy"} />
      <span aria-live="polite">
        {copied === "ok" ? "Copied" : copied === "fail" ? "Select and copy instead" : "Copy details"}
      </span>
    </button>
  );
}
