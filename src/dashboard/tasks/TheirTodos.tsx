import { useState, type ReactElement } from "react";
import type { MemberTodo } from "../../lib/api";
import { firstName } from "../team/format";
import { Sk } from "../ui/States";
import { dayName } from "./model";
import { todayIso } from "./types";
import { sortTodos } from "./useMemberTodos";
import "../../styles/dash13/todos.css";

/** Rows shown before "Show N more". */
const SHOWN = 4;

function dueText(t: MemberTodo): { text: string; late: boolean } {
  if (t.status === "done") return { text: "Done", late: false };
  if (!t.due_date) return { text: "No date", late: false };
  const late = t.due_date < todayIso();
  return { text: `${late ? "Overdue · " : ""}${dayName(t.due_date)}`, late };
}

/**
 * "Their own to-dos": what a person added for themselves in their Zinwe app (DashTeam card, Tasks page). Read-only: the
 * owner can see them but never change them. `first` null = everyone's, each row with the person's first name.
 */
export function TheirTodos({
  todos,
  failed,
  first,
  label = "Their own to-dos",
  className = "",
}: {
  /** undefined while loading. */
  todos: readonly MemberTodo[] | undefined;
  failed: boolean;
  first: string | null;
  label?: string;
  className?: string;
}): ReactElement {
  const [all, setAll] = useState(false);
  const sorted = todos ? sortTodos(todos) : [];
  const shown = all ? sorted : sorted.slice(0, SHOWN);
  const open = sorted.filter((t) => t.status === "open").length;

  return (
    <section className={`ztd ${className}`.trim()} aria-label={first ? `${first}’s own to-dos` : label}>
      <div className="ztd__head">
        <span className="z-lbl ztd__k">{label}</span>
        {sorted.length > 0 ? <span className="z-num ztd__n">{open} open</span> : null}
      </div>
      {todos === undefined ? (
        failed ? (
          <span className="ztd__note">We couldn’t load these. They’ll show when the page refreshes.</span>
        ) : (
          <span role="status" aria-busy="true">
            <span className="z-sr">Loading to-dos</span>
            <Sk w="70%" h={14} />
          </span>
        )
      ) : sorted.length === 0 ? (
        <span className="ztd__note">
          {first
            ? `${first} hasn’t added any to-dos of their own yet. When they do in their Zinwe app, you’ll see them here.`
            : "Nobody has added a to-do of their own yet. When they do in their Zinwe app, you’ll see them here."}
        </span>
      ) : (
        <>
          <ul className="ztd__list">
            {shown.map((t) => {
              const due = dueText(t);
              const stepsDone = t.steps.filter((s) => s.done).length;
              return (
                <li key={t.id} className="ztd__row">
                  <span className={t.status === "done" ? "ztd__mark on" : "ztd__mark"} aria-hidden="true" />
                  <span className="ztd__text">
                    <span className={t.status === "done" ? "ztd__title done" : "ztd__title"}>{t.title}</span>
                    <span className="ztd__meta">
                      {first ? null : `${firstName(t.member_name)} · `}
                      <span className={due.late ? "ztd__late" : undefined}>{due.text}</span>
                      {t.steps.length ? ` · ${stepsDone}/${t.steps.length} steps` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {sorted.length > SHOWN ? (
            <button type="button" className="ztd__more" aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? "Show less" : `Show ${sorted.length - SHOWN} more`}
            </button>
          ) : null}
          <span className="ztd__note">Added in their Zinwe app. You can see these, not change them.</span>
        </>
      )}
    </section>
  );
}
