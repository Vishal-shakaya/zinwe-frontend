import { useEffect, useRef, type ReactElement } from "react";
import { BREAK_NOTE_MAX, breakNoteLength } from "../../lib/api";
import { clampNote, type AskItem, type LocalDecision } from "./model";

/**
 * One request in a person's tile (DashActivity `.ask`): what they asked for and their note, then Approve /
 * Not approved (with an optional note to them). After a decision: "Approved" / "Not approved · “note”", Undo for
 * 6 s, and who sees it.
 */
export function AskBlock({
  item,
  first,
  pos,
  decision,
  noting,
  note,
  error,
  onApprove,
  onDeny,
  onNote,
  onSend,
  onCancel,
  onUndo,
  onChange,
}: {
  item: AskItem;
  first: string;
  pos: string;
  decision: LocalDecision | undefined;
  noting: boolean;
  note: string;
  error: string;
  onApprove: () => void;
  onDeny: () => void;
  onNote: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onChange: () => void;
}): ReactElement {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (noting) input.current?.focus();
  }, [noting]);

  if (decision) {
    return (
      <div role="status" className="za-ask za-ask--done">
        <b style={{ fontSize: 13, color: decision.val === "approved" ? "#17663F" : "#5E574D" }}>
          {decision.val === "approved" ? "Approved" : `Not approved${decision.note ? ` · “${decision.note}”` : ""}`}
        </b>
        {decision.phase === "undo" ? (
          <button type="button" className="za-linkbtn" onClick={onUndo}>
            Undo
          </button>
        ) : decision.phase === "done" ? (
          <button type="button" className="za-linkbtn" onClick={onChange}>
            Change
          </button>
        ) : null}
        <span className="za-sees">
          {decision.phase === "sending" ? "Sending…" : `${first} sees this in ${pos} Zinwe app`}
        </span>
      </div>
    );
  }

  const noteId = `note-${item.id}`;
  const count = breakNoteLength(note);
  return (
    <div className="za-ask">
      <div className="za-ask__text">
        <b>{item.line}</b>
        {item.note ? (
          <span className="za-quote" title={item.note}>
            “{item.note}”
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="za-err">
            {error}
          </span>
        ) : null}
      </div>
      <div className="za-ask__act">
        {noting ? (
          <>
            <label htmlFor={noteId} className="z-sr">
              Add a note for {first} (optional)
            </label>
            <input
              ref={input}
              id={noteId}
              className="za-note"
              value={note}
              onChange={(e) => onNote(clampNote(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
                if (e.key === "Escape") onCancel();
              }}
              placeholder={`Add a note for ${first} (optional)`}
              aria-describedby={`${noteId}-n`}
            />
            <span id={`${noteId}-n`} className="za-count z-num" aria-live="polite">
              {count}/{BREAK_NOTE_MAX}
            </span>
            <button type="button" className="z-btn xs dark" onClick={onSend}>
              Send
            </button>
            <button type="button" className="za-linkbtn" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="z-btn xs dark" onClick={onApprove} aria-label={`Approve ${first}’s ${item.what}`}>
              Approve
            </button>
            <button type="button" className="z-btn xs" onClick={onDeny} aria-label={`Do not approve ${first}’s ${item.what}, add an optional note`}>
              Not approved
            </button>
          </>
        )}
      </div>
    </div>
  );
}
