import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { TASK_STATUS, type SampleTask } from "../fixtures/tasks";
import { ClockMark, TaskMark } from "../tasks/icons";
import { chatTrackOf, dueLabel, dueStyle, isClosed, isFinished, noteByOf, RED, statusStyle } from "../tasks/model";
import { taskActions } from "../tasks/useTasks";

/**
 * A task in the chat thread (DashChat): kicker, title, status / priority / due / steps pills, and when opened the
 * details, steps, stage bars, the person's note and the actions (Approve, Reopen, Reply in chat, Move due,
 * Edit task, Open in Tasks). Same sample task as the Tasks page (fixtures/tasks.ts).
 */
export function TaskCard({
  task: t,
  first,
  open,
  onToggle,
  onEdit,
  onReply,
}: {
  task: SampleTask;
  first: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  /** Reply in chat about this task, with an optional draft. */
  onReply: (draft?: string) => void;
}): ReactElement {
  const finished = isFinished(t);
  const doneN = t.steps.filter((x) => x.done).length;
  const track = chatTrackOf(t);
  const mine = !t.byMember;
  return (
    <article aria-label={`Task: ${t.title}`} className={mine ? "cv-card" : "cv-card mem"}>
      <button type="button" className="tb-head" aria-expanded={open} onClick={onToggle}>
        <span className="cv-card__mark" aria-hidden="true">
          <TaskMark />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="cv-kicker">{t.byMember ? `TASK · ADDED BY ${first.toUpperCase()}` : "TASK"}</span>
            <b style={{ fontSize: 15, lineHeight: 1.3 }}>{t.title}</b>
          </span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span className="cv-pill" style={statusStyle(t.status)}>
              {TASK_STATUS[t.status][0]}
            </span>
            <span className="cv-pill" style={t.high ? RED : { background: "#F2EFE8", color: "#4A443C" }}>
              {t.high ? "High priority" : "Normal"}
            </span>
            <span className="cv-pill" style={dueStyle(t)}>
              <ClockMark />
              {dueLabel(t)}
            </span>
            {t.steps.length ? (
              <span className="cv-pill" style={{ background: "#F2EFE8", color: "#3A352E" }}>
                {doneN}/{t.steps.length} steps
              </span>
            ) : null}
            {t.edited ? (
              <span className="cv-pill" style={{ background: "#F2EFE8", color: "#6B6459" }}>
                Edited
              </span>
            ) : null}
          </span>
        </span>
        <span className="cv-chev" aria-hidden="true" style={{ transform: `rotate(${open ? 180 : 0}deg)` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EDE6", display: "flex", flexDirection: "column", gap: 12 }}>
          {t.details ? <p style={{ margin: 0, color: "#3A352E" }}>{t.details}</p> : null}
          {t.steps.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="cv-kicker">STEPS</span>
              {t.steps.map((x, i) => (
                <div key={`${i}-${x.label}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span aria-hidden="true" className={x.done ? "zk-box on" : "zk-box"}>
                    {x.done ? "✓" : ""}
                  </span>
                  <span style={x.done ? { color: "#6B6358", textDecoration: "line-through" } : { color: "#141210" }}>{x.label}</span>
                  <span className="z-sr">{x.done ? "done" : "not done yet"}</span>
                </div>
              ))}
            </div>
          ) : null}
          {!t.byMember ? (
            <ol aria-label="Progress" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4, gridTemplateColumns: `repeat(${track.length}, minmax(0, 1fr))` }}>
              {track.map((k) => (
                <li key={k.key} style={{ display: "flex", flexDirection: "column", gap: 4 }} aria-current={k.current ? "step" : undefined}>
                  <span style={{ display: "block", height: 5, borderRadius: 999, background: k.help ? "#8A5300" : k.reached ? (k.green ? "#17663F" : "#F26A0A") : "#E7E3DA" }} />
                  <span style={{ fontSize: 11, color: k.reached ? "#3A352E" : "#6B6358", fontWeight: k.current ? 700 : 500 }}>{k.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {t.needsOk && !finished ? <span style={{ fontSize: 13, color: "#4A443C" }}>Needs your OK when done.</span> : null}
          {t.note && !isClosed(t) ? (
            <p style={{ margin: 0, padding: "10px 12px", borderRadius: 10, fontSize: 13, ...(t.status === "help" ? { background: "#FBF0D9", color: "#5C3A00" } : { background: "#F7F6F2", color: "#3A352E" }) }}>
              <b>{noteByOf(t, first)}:</b> {t.note}
            </p>
          ) : null}
          {t.status === "review" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="z-btn sm green" onClick={() => taskActions.approve(t)}>
                Approve
              </button>
              <button type="button" className="z-btn sm" onClick={() => taskActions.reopenQuick(t)}>
                Reopen
              </button>
            </div>
          ) : null}
          {t.status === "help" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="z-btn sm pri" onClick={() => onReply(/edit access/i.test(t.note) ? "Done, you have edit access now. " : "")}>
                Reply in chat
              </button>
              <button type="button" className="z-btn sm" onClick={() => taskActions.moveDue(t)}>
                Move due to tomorrow
              </button>
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {!t.byMember && !finished ? (
              <button type="button" className="zk-link" onClick={onEdit}>
                Edit task
              </button>
            ) : null}
            {t.status === "done" && !t.byMember ? (
              <button type="button" className="zk-link" onClick={() => taskActions.reopenQuick(t)}>
                Reopen
              </button>
            ) : null}
            <Link className="zk-link" to={`/app/tasks#task=${t.id}`}>
              Open in Tasks
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}
