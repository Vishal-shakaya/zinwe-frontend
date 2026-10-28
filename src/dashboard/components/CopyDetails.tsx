import { useEffect, useState, type ReactElement } from "react";
import { copyText } from "../../lib/clipboard";
import type { Member } from "../../lib/api";
import { buildInviteText } from "../features/invite";

interface CopyDetailsProps {
  member: Pick<Member, "name" | "email" | "member_id">;
  /** Told what happened ("All three steps copied…"), for the status line under the steps. */
  onCopied?: (ok: boolean) => void;
}

/**
 * "Copy all" (DashTeam, Add a person → done): the three setup steps for a new person, to paste anywhere.
 */
export function CopyDetails({ member, onCopied }: CopyDetailsProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const first = member.name.trim().split(/\s+/)[0] || member.name;

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onCopy = async () => {
    const ok = await copyText(buildInviteText(member));
    setCopied(ok);
    onCopied?.(ok);
  };

  return (
    <button type="button" className="z-btn sm dark" onClick={() => void onCopy()} aria-label={`Copy all three steps for ${first}`}>
      {copied ? "Copied" : "Copy all"}
    </button>
  );
}
