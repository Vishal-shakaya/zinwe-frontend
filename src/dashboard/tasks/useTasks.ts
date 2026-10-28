import { useCallback, useEffect } from "react";
import type { Member } from "../../lib/api";
import {
  addDays,
  createTask,
  listTasks,
  removeTask,
  restoreTask,
  saveTask,
  TASKS_CHANGED_EVENT,
  todayIso,
  type SampleTask,
} from "../fixtures/tasks";
import { useResource, type Resource } from "../useResource";
import { nowLabel, type TaskPerson } from "./model";
import type { TaskFormValues } from "./TaskForm";

/**
 * SAMPLE tasks (fixtures/tasks.ts, until FR-20 ships) laid onto the real members. Every change goes through
 * saveTask / createTask / removeTask, which fire TASKS_CHANGED_EVENT: this list, other open views and the
 * Tasks badge in the menu all refresh.
 */
export function useTasks(members: readonly Member[] | undefined): Resource<SampleTask[]> {
  const load = useCallback((signal: AbortSignal) => listTasks(signal, members), [members]);
  const tasks = useResource(load);
  const { reload } = tasks;
  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, reload);
  }, [reload]);
  return tasks;
}

/** The task actions, worded and logged as the boards do. Each returns what Undo needs (the task as it was). */
export const taskActions = {
  approve(t: SampleTask): SampleTask | null {
    if (t.status !== "review") return null;
    saveTask(t.id, { status: "approved" }, { k: "approved" });
    return t;
  },
  /** Tasks drawer: "Reopen with note". */
  reopen(t: SampleTask, note: string): void {
    const text = note.trim() || "Please take another look.";
    saveTask(t.id, { status: "progress", note: text, noteBy: "You" }, { k: "reopened", text });
  },
  /** Chat card: "Reopen" in one click. */
  reopenQuick(t: SampleTask): void {
    saveTask(t.id, { status: "progress", note: "Reopened: please check the last step again.", noteBy: "You" }, { k: "reopened", text: "Please check the last step again." });
  },
  nudge(t: SampleTask): void {
    if (t.nudgedAt) return;
    saveTask(t.id, { nudgedAt: nowLabel() }, { k: "nudged" });
  },
  cancel(t: SampleTask): SampleTask | null {
    return removeTask(t.id);
  },
  reply(t: SampleTask, text: string): void {
    if (text.trim()) saveTask(t.id, {}, { k: "reply", text: text.trim() });
  },
  moveDue(t: SampleTask): void {
    saveTask(t.id, { due: addDays(todayIso(), 1), status: "progress", note: "" }, { k: "due" });
  },
  undo(prev: SampleTask): void {
    restoreTask(prev);
  },
  /** Save the task form: a new task for that person, or the edited one ("Edited" tag, ticked steps stay ticked). */
  submit(v: TaskFormValues, editing: SampleTask | null): SampleTask | null {
    if (editing) {
      return saveTask(
        editing.id,
        {
          title: v.title,
          details: v.details,
          due: v.due,
          time: v.time,
          high: v.high,
          confirm: v.confirm,
          needsOk: v.needsOk,
          email: v.email,
          edited: true,
          steps: v.steps.map((label) => ({ label, done: !!editing.steps.find((y) => y.label === label)?.done })),
        },
        { k: "edited" },
      );
    }
    const t = createTask({
      who: v.person.sampleKey,
      memberId: v.person.memberId,
      name: v.person.name,
      title: v.title,
      details: v.details,
      due: v.due,
      time: v.time,
      high: v.high,
      confirm: v.confirm,
      needsOk: v.needsOk,
      email: v.email,
      steps: v.steps.map((label) => ({ label, done: false })),
    });
    // Someone at their PC sees it a few seconds later (sample), like the read receipts in Chat.
    if (v.person.presenceKind === "working") {
      window.setTimeout(() => saveTask(t.id, { status: t.confirm ? "waiting" : "seen" }, { k: "seen" }), 3500);
    }
    return t;
  },
};

/** A person's open tasks count ("1 task" / "3 tasks"). */
export function openCountFor(person: TaskPerson, tasks: readonly SampleTask[]): number {
  return tasks.filter((t) => t.memberId === person.memberId && (person.memberId !== null || t.who === person.sampleKey) && t.status !== "done" && t.status !== "approved").length;
}
