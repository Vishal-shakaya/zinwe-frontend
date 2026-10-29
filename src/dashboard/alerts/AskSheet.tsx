import { useState, type ReactElement } from "react";
import { errorMessage, sendMessage, type EventSeverity } from "../../lib/api";
import { SAMPLES_ON } from "../fixtures";
import { recordAsk } from "../fixtures/majorAlerts";
import { Sheet, Spinner } from "../ui/States";

/** Who to ask, about which alert(s). */
export interface AskTarget {
  /** Every event id of the row (the ask is recorded on all of them). */
  ids: number[];
  memberId: number;
  first: string;
  /** The alert's person-first title ("About: …"). */
  title: string;
  severity: EventSeverity;
  /** The kind suggested wording; the owner edits it freely. */
  draft: string;
}

/**
 * "Ask {First}" (DashAlerts / DashOverview sheet): a kind, editable message to their Zinwe app, no channel
 * picker. Sent with the existing message API (it lands in their widget and in Chat). The alert stays open,
 * marked "Asked · waiting for reply", until the owner presses Mark as fine (the ask link is FR-35 sample data).
 */
export function AskSheet({
  target,
  where,
  onClose,
  onSent,
}: {
  target: AskTarget | null;
  /** "alert" = Alerts page wording ("on this alert"); "here" = Overview. */
  where: "alert" | "here";
  onClose: () => void;
  onSent: (target: AskTarget) => void;
}): ReactElement | null {
  if (!target) return null;
  return <AskSheetBody key={target.ids.join(",")} target={target} where={where} onClose={onClose} onSent={onSent} />;
}

function AskSheetBody({
  target,
  where,
  onClose,
  onSent,
}: {
  target: AskTarget;
  where: "alert" | "here";
  onClose: () => void;
  onSent: (target: AskTarget) => void;
}): ReactElement {
  const [draft, setDraft] = useState(target.draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const off = !draft.trim() || busy;
  const id = where === "alert" ? "al-ask-msg" : "ov-ask-msg";

  const send = async () => {
    if (off) return;
    setBusy(true);
    setError(null);
    try {
      const msg = await sendMessage(target.memberId, {
        title: `About: ${target.title}`.slice(0, 120),
        body: draft.trim(),
        severity: target.severity,
        channel: "chat",
      });
      recordAsk(target.ids, { at: new Date().toISOString(), memberId: target.memberId, messageId: msg?.id ?? null });
      onSent(target);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Sheet open title={`Ask ${target.first}`} sub={`About: ${target.title}`} onClose={onClose} labelledBy={where === "alert" ? "al-sheet-h" : "ov-sheet-h"}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600 }}>
        Message
      </label>
      <textarea id={id} rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
      <span style={{ fontSize: 12.5, color: "#6B6358" }}>
        {/* The alert ↔ reply link is sample data until FR-35: production builds only promise Chat. */}
        It goes to {target.first}’s Zinwe app. The reply shows {SAMPLES_ON ? `${where === "alert" ? "on this alert" : "here"} and ` : ""}in Chat.
        The wording asks, it doesn’t accuse; edit it freely.
      </span>
      {error ? (
        <span className="z-err" role="alert">
          {error}
        </span>
      ) : null}
      <div className="zn-sheet-acts">
        <button type="button" className="z-btn sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="z-btn sm dark" aria-disabled={off} onClick={() => void send()}>
          {busy ? <Spinner size={16} tone="on-dark" /> : null}
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </Sheet>
  );
}
