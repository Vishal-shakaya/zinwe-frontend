import { useCallback, useEffect } from "react";
import { createTask, listTasks, sendMessage, taskAction, updateTask, type Task } from "../../lib/api";
import { useResource, type Resource } from "../useResource";
import type { TaskPerson } from "./model";
import type { TaskFormValues } from "./TaskForm";
import { addDays, dueAtOf, tasksChanged, TASKS_CHANGED_EVENT, todayIso, toView, type TaskView } from "./types";

/** How often open task views check for their updates (a member's taps arrive through the API). */
export const TASKS_POLL_MS = 15_000;

/**
 * Every task of the account (FR-20 v2: GET tasks/?status=all), as TaskViews, newest activity first. Any change made
 * here (taskActions) fires TASKS_CHANGED_EVENT, so this list, other open views and the Tasks badge refresh at once;
 * the member's side arrives on the poll. `enabled` false (no team_chat on the plan) loads nothing.
 */
export function useTasks({ enabled = true, pollMs = TASKS_POLL_MS }: { enabled?: boolean; pollMs?: number } = {}): Resource<TaskView[]> {
  const load = useCallback(
    (signal: AbortSignal) => (enabled ? listTasks({ status: "all" }, signal).then((rows) => rows.map((t) => toView(t))) : Promise.resolve([])),
    [enabled],
  );
  const tasks = useResource(load, { pollMs: enabled ? pollMs : undefined });
  const { reload } = tasks;
  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, reload);
  }, [reload]);
  return tasks;
}

async function done(p: Promise<Task>): Promise<TaskView> {
  const saved = await p;
  tasksChanged();
  return toView(saved);
}

/** The task actions, worded as the boards do. Each resolves with the saved task (and refreshes every view). */
export const taskActions = {
  /** Approve it (from "waiting for your OK"), or "Mark done" from any open stage: both end Approved. */
  approve(t: TaskView, note?: string): Promise<TaskView> {
    return done(taskAction(t.id, "approve", note));
  },
  /** Back to In progress, with what needs another look. */
  reopen(t: TaskView, note: string): Promise<TaskView> {
    return done(taskAction(t.id, "reopen", note.trim() || "Please take another look."));
  },
  nudge(t: TaskView): Promise<TaskView> {
    return done(taskAction(t.id, "nudge"));
  },
  cancel(t: TaskView): Promise<TaskView> {
    return done(taskAction(t.id, "cancel"));
  },
  /**
   * Answer their help request: the reply goes to their chat (titled "About: <task>", so Chat quotes the task), and
   * the task goes back to In progress with your reply as its note.
   */
  async reply(t: TaskView, text: string): Promise<TaskView> {
    const body = text.trim();
    await sendMessage(t.memberId, { title: `About: ${t.title}`.slice(0, 120), body, channel: "chat" });
    if (t.status !== "help") {
      tasksChanged();
      return t;
    }
    return done(taskAction(t.id, "reopen", body));
  },
  /** Same time, tomorrow (or any time tomorrow). */
  moveDue(t: TaskView): Promise<TaskView> {
    return done(updateTask(t.id, { due_at: dueAtOf(addDays(todayIso(), 1), t.time) }));
  },
  /** Save the task form: a new task for that person, or the edited one (ticked steps stay ticked). */
  submit(v: TaskFormValues, editing: TaskView | null): Promise<TaskView> {
    const fields = {
      title: v.title,
      note: v.details,
      due_at: dueAtOf(v.due, v.time),
      priority: v.high ? ("high" as const) : ("normal" as const),
    };
    if (editing) {
      const steps = v.steps.map((label) => {
        const same = editing.steps.find((s) => s.label === label);
        return same ? { id: same.id, title: label } : label;
      });
      return done(updateTask(editing.id, { ...fields, steps }));
    }
    if (v.person.memberId == null) return Promise.reject(new Error("Pick a person on your team."));
    return done(createTask(v.person.memberId, { ...fields, steps: v.steps }));
  },
};

/** A person's open tasks count ("1 task" / "3 tasks"): everything they still have to finish. */
export function openCountFor(person: TaskPerson, tasks: readonly TaskView[]): number {
  return tasks.filter((t) => t.memberId === person.memberId && !["review", "approved", "cancelled"].includes(t.status)).length;
}
