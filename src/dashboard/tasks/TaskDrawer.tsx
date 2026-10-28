import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { CLOSED, TASK_STATUS, type SampleTask } from "../fixtures/tasks";
import { ZIcon } from "../ui/ZIcon";
import { dueLabel, dueStyle, LOGDOT, logText, NEUTRAL, noteByOf, RED, statusStyle, SUB, trackOf, whenOf, type TaskPerson } from "./model";
import { Avatar } from "./Avatar";
import { taskActions } from "./useTasks";

/**
 * The task drawer on the Tasks page (DashTasks): stage, note, checklist, actions (Approve, Reopen with note,
 * Nudge, Edit, Open chat, Cancel task), the help reply and the activity log.
 */
export function TaskDrawer({
  task: t,
  person: p,
  chatHref,
  onClose,
  onEdit,
  say,
}: {
  task: SampleTask;
  person: TaskPerson;
  chatHref: string;
  onClose: () => void;
  onEdit: (t: SampleTask) => void;
  /** Toast, with what Undo puts back. */
  say: (text: string, undo?: SampleTask) => void;
}): ReactElement {
  const f = p.first;
  const [reopening, setReopening] = useState(false);
  const [reopenNote, setReopenNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reply, setReply] = useState("");
  const panel = useRef<HTMLElement>(null);
  const state = useRef({ reopening, confirming, onClose });
  useEffect(() => {
    state.current = { reopening, confirming, onClose };
  });

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => document.getElementById("dw-close")?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      // Esc closes the innermost layer first: the reopen / cancel forms, then the drawer.
      if (e.key === "Escape") {
        if (document.getElementById("cm-h")) return; // the task form is open above: it handles Esc
        e.preventDefault();
        if (state.current.reopening || state.current.confirming) {
          setReopening(false);
          setConfirming(false);
        } else state.current.onClose();
        return;
      }
      const root = panel.current;
      if (e.key !== "Tab" || !root || document.getElementById("cm-h")) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>("button:not([disabled]), textarea, a[href]"));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      if (back && document.contains(back)) back.focus();
    };
  }, []);

  const finished = t.status === "done" || t.status === "review" || t.status === "approved";
  const closed = CLOSED.includes(t.status);
  const isHelp = t.status === "help";
  const reopenable = (t.status === "review" || closed) && !t.byMember;
  const track = trackOf(t);
  const doneN = t.steps.filter((x) => x.done).length;
  const noteStyle: CSSProperties = {
    margin: 0,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    ...(isHelp ? { background: "#FBF0D9", color: "#5C3A00" } : t.noteBy === "You" ? { background: "#FCE8E4", color: "#5C1A0E" } : { background: "#E3F4EA", color: "#0F3D25" }),
  };
  const finalReached = track.findIndex((k) => k.current) === track.length - 1;

  const approve = () => {
    const prev = taskActions.approve(t);
    if (prev) say(`Approved · ${f} sees this in their Zinwe app`, prev);
  };
  const doReopen = () => {
    taskActions.reopen(t, reopenNote);
    setReopening(false);
    setReopenNote("");
    say(`Reopened · back in ${f}’s list`);
  };
  const nudge = () => {
    taskActions.nudge(t);
    say(`Nudged · ${f} gets a reminder in their Zinwe app`);
  };
  const cancel = () => {
    const prev = taskActions.cancel(t);
    if (prev) say(`Task cancelled · removed from ${f}’s app`, prev);
    onClose();
  };
  const sendReply = () => {
    if (!reply.trim()) return;
    taskActions.reply(t, reply);
    setReply("");
    say(`Sent to ${f}`);
  };

  return (
    <div>
      <button type="button" className="zk-sheet-bg" aria-label="Close task" tabIndex={-1} onClick={onClose} style={{ zIndex: 91, background: "rgba(20,18,16,.32)" }} />
      <aside ref={panel} role="dialog" aria-modal="true" aria-labelledby="dw-h" className="zk-sheet" style={{ zIndex: 92, width: "min(540px, 100%)", boxShadow: "-14px 0 36px rgba(20,18,16,.16)", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid #EFECE5", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span className="zk-pill" style={statusStyle(t.status)}>
              {TASK_STATUS[t.status][0]}
            </span>
            <button type="button" id="dw-close" className="zk-ic" aria-label="Close task" onClick={onClose}>
              <ZIcon d="M6 6l12 12M18 6 6 18" size={16} stroke={2.2} />
            </button>
          </div>
          <h2 id="dw-h" style={{ margin: 0, fontSize: 20, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            {t.title}
          </h2>
          {t.details ? <p style={{ margin: 0, color: "#3A352E" }}>{t.details}</p> : null}
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <dt className="zk-lbl">Person</dt>
              <dd style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar person={p} size={36} />
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
                  <b style={{ fontWeight: 600 }}>{p.name}</b>
                  <span style={{ fontSize: 12, color: "#6B6459" }}>
                    {p.role}
                    {p.presence ? ` · ${p.presence}` : ""}
                  </span>
                </span>
              </dd>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <dt className="zk-lbl">Due</dt>
              <dd style={{ margin: 0 }}>
                <span className="zk-pill" style={dueStyle(t)}>
                  {dueLabel(t)}
                </span>
              </dd>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <dt className="zk-lbl">Priority</dt>
              <dd style={{ margin: 0 }}>
                <span className="zk-pill" style={t.high ? RED : NEUTRAL}>
                  {t.high ? "High priority" : "Normal"}
                </span>
              </dd>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <dt className="zk-lbl">Sign-off</dt>
              <dd style={{ margin: 0, fontSize: 13, color: "#3A352E" }}>
                {t.byMember ? `Added by ${f}, nothing needed` : t.needsOk ? "Needs your OK when done" : `Closes when ${f} marks it done`}
              </dd>
            </div>
          </dl>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          <section aria-labelledby="trk-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 id="trk-h" className="zk-lbl" style={{ margin: 0 }}>
              Stage
            </h3>
            <ol style={{ listStyle: "none", margin: 0, padding: "4px 0 0", display: "grid", gap: 0, gridTemplateColumns: `repeat(${track.length}, minmax(0, 1fr))` }}>
              {track.map((k, i) => {
                const fill = k.help ? "#FBF0D9" : k.reached ? (k.green ? "#17663F" : "#F26A0A") : "#fff";
                const border = k.help ? "#8A5300" : k.awaitingOk ? "#17663F" : k.reached ? fill : "#DCD6CB";
                const lineOn = k.reached || k.awaitingOk;
                return (
                  <li key={k.key} aria-current={k.current ? "step" : undefined} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center", minWidth: 0 }}>
                    {i > 0 ? (
                      <span
                        aria-hidden="true"
                        style={{ position: "absolute", top: 11, left: "-50%", right: "50%", height: 2, background: lineOn ? (k.help ? "#8A5300" : k.green ? "#17663F" : "#F26A0A") : "#E7E3DA" }}
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        border: `2px ${k.awaitingOk ? "dashed" : "solid"} ${border}`,
                        background: k.awaitingOk ? "#fff" : fill,
                        color: k.help ? "#8A5300" : k.green ? "#fff" : "#141210",
                        boxShadow: k.current || k.awaitingOk ? `0 0 0 4px ${k.help ? "#FBF0D9" : k.green || k.awaitingOk ? "#E3F4EA" : "#FDEBDC"}` : undefined,
                      }}
                    >
                      {k.help ? "!" : k.reached ? "✓" : ""}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        lineHeight: 1.2,
                        color: k.help ? "#8A5300" : k.reached || k.awaitingOk ? "#141210" : "#6B6358",
                        fontWeight: k.current || k.awaitingOk || (finalReached && k.current) ? 700 : 500,
                      }}
                    >
                      {k.label}
                    </span>
                    <span className="z-num" style={{ fontSize: 11, color: "#6B6459", lineHeight: 1.2 }}>
                      {k.when}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {t.note && !closed ? (
            <p style={noteStyle}>
              <b>{noteByOf(t, f)}:</b> {t.note}
            </p>
          ) : null}

          {t.steps.length ? (
            <section aria-labelledby="chk-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 id="chk-h" className="zk-lbl" style={{ margin: 0 }}>
                Checklist · {doneN}/{t.steps.length}
              </h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {t.steps.map((x, i) => (
                  <li key={`${i}-${x.label}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={x.done ? "zk-box on" : "zk-box"} aria-hidden="true">
                      {x.done ? "✓" : ""}
                    </span>
                    <span style={x.done ? { color: "#6B6358", textDecoration: "line-through" } : { color: "#141210" }}>{x.label}</span>
                    <span className="z-sr">{x.done ? "done" : "not done yet"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-label="Actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {t.status === "review" ? (
                <button type="button" className="z-btn sm green" onClick={approve}>
                  Approve
                </button>
              ) : null}
              {reopenable ? (
                <button
                  type="button"
                  className="z-btn sm"
                  aria-expanded={reopening}
                  onClick={() => {
                    setReopening((r) => !r);
                    setConfirming(false);
                    window.setTimeout(() => document.getElementById("dw-reopen")?.focus(), 40);
                  }}
                >
                  Reopen with note
                </button>
              ) : null}
              {SUB[t.status] ? (
                <button type="button" className="z-btn sm" disabled={!!t.nudgedAt} onClick={nudge}>
                  {t.nudgedAt ? "Nudged" : "Nudge"}
                </button>
              ) : null}
              {!t.byMember && !finished ? (
                <button type="button" className="z-btn sm" onClick={() => onEdit(t)}>
                  Edit
                </button>
              ) : null}
              <Link className="z-btn sm" to={chatHref}>
                Open chat with {f}
              </Link>
              {!t.byMember && !closed ? (
                <button
                  type="button"
                  className="z-btn sm"
                  style={{ color: "#B02A15" }}
                  aria-expanded={confirming}
                  onClick={() => {
                    setConfirming((c) => !c);
                    setReopening(false);
                  }}
                >
                  Cancel task
                </button>
              ) : null}
            </div>

            {isHelp ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#FBF0D9", borderRadius: 12 }}>
                <label htmlFor="dw-reply" className="zk-lab" style={{ color: "#5C3A00" }}>
                  Reply to {f}
                </label>
                <textarea id="dw-reply" rows={2} className="zk-inp" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Lands in their Zinwe app" style={{ resize: "vertical" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" className="z-btn sm pri" disabled={!reply.trim()} onClick={sendReply}>
                    Send reply
                  </button>
                  <button type="button" className="z-btn sm" onClick={() => taskActions.moveDue(t)}>
                    Move due to tomorrow
                  </button>
                </div>
              </div>
            ) : null}

            {reopening ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#F7F6F2", border: "1px solid #E7E3DA", borderRadius: 12 }}>
                <label htmlFor="dw-reopen" className="zk-lab">
                  What needs another look?
                </label>
                <textarea id="dw-reopen" rows={2} className="zk-inp" value={reopenNote} onChange={(e) => setReopenNote(e.target.value)} placeholder="e.g. The checkout export is missing" style={{ resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="z-btn sm dark" onClick={doReopen}>
                    Reopen
                  </button>
                  <button
                    type="button"
                    className="z-btn sm"
                    onClick={() => {
                      setReopening(false);
                      setReopenNote("");
                    }}
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : null}

            {confirming ? (
              <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#FCE8E4", borderRadius: 12 }}>
                <span style={{ fontSize: 13, color: "#5C1A0E" }}>Cancel this task? It leaves {f}’s Zinwe app.</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="z-btn sm zk-red" onClick={cancel}>
                    Cancel task
                  </button>
                  <button type="button" className="z-btn sm" onClick={() => setConfirming(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="act-h" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 id="act-h" className="zk-lbl" style={{ margin: 0 }}>
              Activity
            </h3>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
              {t.log.map((e, i) => (
                <li key={i} style={{ display: "flex", gap: 10, paddingBottom: 10 }}>
                  <span aria-hidden="true" style={{ flex: "none", marginTop: 6, width: 8, height: 8, borderRadius: "50%", background: LOGDOT[e.k] ?? "#CFC8BB" }} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13 }}>{logText(e, f)}</span>
                    <span className="z-num" style={{ fontSize: 11, color: "#6B6459" }}>
                      {whenOf(e)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}
