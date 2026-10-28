import type { Member } from "../../lib/api";
import { sample, sampleStore } from "./index";

/**
 * SAMPLE (DashTasks, DashChat task cards, DashOverview Tasks card): FR-20 tasks are not served by the API yet.
 * Copied from the DashTasks board (same ids, stages, due days and logs); "today" is the real today, so the
 * sample reads live. When the board's people are shown against a real account, each sample person is laid onto a
 * real active member (in order, wrapping), so Chat with Aisha shows "her" tasks — see `withPeople`.
 *
 * When FR-20 ships: `listTasks` / `saveTask` / `createTask` become API calls; the types stay.
 */

export type TaskStatus = "sent" | "seen" | "waiting" | "accepted" | "progress" | "help" | "done" | "review" | "approved";

export type TaskLogKind =
  | "sent"
  | "added"
  | "seen"
  | "confirmed"
  | "started"
  | "step"
  | "help"
  | "done"
  | "approved"
  | "reopened"
  | "nudged"
  | "edited"
  | "reply"
  | "due";

export interface TaskLogEntry {
  k: TaskLogKind;
  /** ISO day, yyyy-mm-dd. */
  day: string;
  /** "9:20 AM" */
  time: string;
  text?: string;
  email?: boolean;
}

export interface TaskStep {
  label: string;
  done: boolean;
}

export interface SampleTask {
  id: number;
  /** Sample person key (first name, lower case), see SAMPLE_PEOPLE. */
  who: string;
  /** Real member the sample person is laid onto (withPeople), else null. */
  memberId: number | null;
  /** Display name (real member's name when laid onto one). */
  name: string;
  title: string;
  details: string;
  /** ISO day. */
  due: string;
  /** "5:00 PM" or "" (end of day). */
  time: string;
  high: boolean;
  status: TaskStatus;
  steps: TaskStep[];
  note: string;
  noteBy: string;
  /** Asked the person to confirm before starting. */
  confirm: boolean;
  /** Needs the owner's OK when done. */
  needsOk: boolean;
  /** The member added it for themselves. */
  byMember: boolean;
  edited: boolean;
  /** Also sent by email. */
  email: boolean;
  nudgedAt: string;
  log: TaskLogEntry[];
}

export interface SamplePerson {
  id: string;
  name: string;
  role: string;
  pc: string;
  presence: string;
  pcOn: boolean;
  pos: "his" | "her";
}

/** The whole Kitecrest team (shared fixture). The ids are first names, so #m=<first> and /app/chat/<first> line up. */
export const SAMPLE_PEOPLE: readonly SamplePerson[] = [
  { id: "priya", name: "Priya Nair", role: "Accounts", pc: "KC-ACCOUNTS-01", presence: "Working", pcOn: true, pos: "her" },
  { id: "arjun", name: "Arjun Mehta", role: "Developer", pc: "KC-DEV-01", presence: "Working", pcOn: true, pos: "his" },
  { id: "sneha", name: "Sneha Reddy", role: "Designer", pc: "KC-DESIGN-02", presence: "Working", pcOn: true, pos: "her" },
  { id: "karan", name: "Karan Malhotra", role: "Sales", pc: "KC-SALES-LAPTOP-02", presence: "Working", pcOn: true, pos: "his" },
  { id: "emily", name: "Emily Carter", role: "Management", pc: "KC-PM-LAPTOP-01", presence: "On break since 1:38 PM", pcOn: true, pos: "her" },
  { id: "olivia", name: "Olivia Martinez", role: "Developer", pc: "KC-QA-01", presence: "Working", pcOn: true, pos: "her" },
  { id: "jake", name: "Jake Thompson", role: "Sales", pc: "KC-CS-LAPTOP-03", presence: "Day ended", pcOn: true, pos: "his" },
  { id: "michael", name: "Michael Chen", role: "Developer", pc: "KC-DEV-03", presence: "Working", pcOn: true, pos: "his" },
  { id: "vikram", name: "Vikram Singh", role: "Operations", pc: "DESKTOP-VIKRAM · LAPTOP-VIKRAM", presence: "Working", pcOn: true, pos: "his" },
  { id: "fatima", name: "Fatima Sheikh", role: "Operations", pc: "KC-FRONT-DESK", presence: "Not in", pcOn: false, pos: "her" },
];

/** Stage labels and colours (shared by Tasks, Chat and Overview): [label, text colour, background]. */
export const TASK_STATUS: Record<TaskStatus, readonly [string, string, string]> = {
  sent: ["Sent", "#5E574D", "#EFECE5"],
  seen: ["Seen", "#5E574D", "#EFECE5"],
  waiting: ["Waiting for them to confirm", "#5E574D", "#EFECE5"],
  accepted: ["Confirmed", "#1B4FB0", "#E6EEFB"],
  progress: ["In progress", "#8A3A04", "#FDEBDC"],
  help: ["Needs help", "#8A5300", "#FBF0D9"],
  done: ["Done", "#FFFFFF", "#17663F"],
  review: ["Done · waiting for your OK", "#17663F", "#E3F4EA"],
  approved: ["Approved", "#FFFFFF", "#17663F"],
};

export const TASK_SHORT: Record<TaskStatus, string> = {
  sent: "Sent",
  seen: "Seen",
  waiting: "Waiting to confirm",
  accepted: "Confirmed",
  progress: "In progress",
  help: "Needs help",
  review: "Waiting for your OK",
  done: "Done",
  approved: "Approved",
};

/** Board columns (DashTasks COLS). */
export const TASK_COLUMNS = [
  { id: "todo", label: "To do", dot: "#6B6358", has: ["sent", "seen", "waiting"], empty: "Nothing new. Tasks you send land here." },
  { id: "confirmed", label: "Confirmed", dot: "#1B4FB0", has: ["accepted"], empty: "No one is waiting to start." },
  { id: "progress", label: "In progress", dot: "#F26A0A", has: ["help", "progress"], empty: "Nobody is on a task right now." },
  { id: "review", label: "Waiting for your OK", dot: "#2E9E62", has: ["review"], empty: "Nothing to approve." },
  { id: "done", label: "Done", dot: "#17663F", has: ["done", "approved"], empty: "Nothing finished yet." },
] as const satisfies ReadonlyArray<{ id: string; label: string; dot: string; has: readonly TaskStatus[]; empty: string }>;

export const FINISHED: readonly TaskStatus[] = ["done", "review", "approved"];
export const CLOSED: readonly TaskStatus[] = ["done", "approved"];

const pad = (n: number) => String(n).padStart(2, "0");
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
/** The sample's "today" is the real today. */
export function todayIso(): string {
  return isoDay(new Date());
}

function seed(): SampleTask[] {
  const TODAY = todayIso();
  const YEST = addDays(TODAY, -1);
  const TOMORROW = addDays(TODAY, 1);
  const LATER = addDays(TODAY, 2);
  const WEEK_AGO = addDays(TODAY, -5);
  const steps = (labels: string[], n: number): TaskStep[] => labels.map((label, i) => ({ label, done: i < n }));
  const L = (k: TaskLogKind, time: string, extra?: Partial<TaskLogEntry>): TaskLogEntry => ({ k, day: TODAY, time, ...extra });
  const Y = (k: TaskLogKind, time: string, extra?: Partial<TaskLogEntry>): TaskLogEntry => ({ k, day: YEST, time, ...extra });
  const W = (k: TaskLogKind, time: string): TaskLogEntry => ({ k, day: WEEK_AGO, time });
  const task = (o: Partial<SampleTask> & Pick<SampleTask, "id" | "who" | "title" | "due" | "status">): SampleTask => ({
    memberId: null,
    name: SAMPLE_PEOPLE.find((p) => p.id === o.who)?.name ?? o.who,
    details: "",
    time: "",
    high: false,
    steps: [],
    note: "",
    noteBy: "",
    confirm: false,
    needsOk: false,
    byMember: false,
    edited: false,
    email: false,
    nudgedAt: "",
    log: [],
    ...o,
  });
  return [
    task({ id: 1, who: "priya", title: "Reconcile October GST input credit", details: "Match the purchase register with GSTR-2B and list every mismatch for the CA.", due: TODAY, time: "5:00 PM", high: true, status: "progress", needsOk: true, email: true,
      steps: steps(["Download GSTR-2B from the portal", "Match the purchase register", "List mismatches for the CA"], 2),
      log: [L("sent", "9:20 AM", { email: true }), L("seen", "9:21 AM"), L("started", "9:34 AM"), L("step", "10:48 AM", { text: "Download GSTR-2B from the portal" }), L("step", "1:52 PM", { text: "Match the purchase register" })] }),
    task({ id: 2, who: "priya", title: "Chase Sharma Traders for 2 missing invoices", due: TODAY, status: "progress", byMember: true, log: [L("added", "11:42 AM"), L("started", "11:42 AM")] }),
    task({ id: 3, who: "arjun", title: "Ship the client-portal login fix", due: TODAY, time: "12:00 PM", status: "review", needsOk: true,
      steps: steps(["Fix the session timeout", "Test on staging", "Deploy"], 3), note: "Deployed at 11:05. Staging and live both checked.", noteBy: "Arjun",
      log: [Y("sent", "4:40 PM"), Y("seen", "4:52 PM"), L("started", "9:05 AM"), L("step", "10:20 AM", { text: "Fix the session timeout" }), L("step", "10:58 AM", { text: "Test on staging" }), L("step", "11:05 AM", { text: "Deploy" }), L("done", "11:06 AM", { text: "Deployed at 11:05. Staging and live both checked." })] }),
    task({ id: 4, who: "arjun", title: "Update the README for the new API keys", due: TODAY, status: "done", log: [L("sent", "9:02 AM"), L("seen", "9:03 AM"), L("started", "9:10 AM"), L("done", "10:02 AM")] }),
    task({ id: 5, who: "sneha", title: "Export the new brand screens for review", details: "Home, pricing and checkout, desktop and phone.", due: TODAY, time: "6:30 PM", status: "help",
      steps: steps(["Home", "Pricing", "Checkout"], 1), note: "The Figma file is view-only for me. Can you give me edit access?", noteBy: "Sneha",
      log: [L("sent", "10:02 AM"), L("seen", "10:14 AM"), L("started", "10:20 AM"), L("step", "11:30 AM", { text: "Home" }), L("help", "12:05 PM", { text: "The Figma file is view-only for me. Can you give me edit access?" })] }),
    task({ id: 6, who: "karan", title: "Call back Sunline Cafe about the menu app", due: TODAY, time: "11:00 AM", high: true, status: "waiting", confirm: true, email: true,
      log: [Y("sent", "5:15 PM", { email: true }), L("seen", "9:48 AM")] }),
    task({ id: 7, who: "emily", title: "Write the sprint summary for Brightway", due: LATER, status: "progress",
      steps: steps(["Collect ticket notes", "Draft summary", "Share with Arjun", "Send to client"], 1),
      log: [L("sent", "9:30 AM"), L("seen", "9:41 AM"), L("started", "9:45 AM"), L("step", "11:15 AM", { text: "Collect ticket notes" })] }),
    task({ id: 8, who: "olivia", title: "Retest checkout on Safari after the fix", due: TOMORROW, time: "12:00 PM", status: "sent", log: [L("sent", "1:55 PM")] }),
    task({ id: 9, who: "sneha", title: "Resize the Diwali banner for Instagram", details: "Square post and story sizes.", due: LATER, time: "5:00 PM", status: "sent", log: [L("sent", "1:40 PM")] }),
    task({ id: 10, who: "karan", title: "Send the Austin pitch deck to Emily", due: TOMORROW, time: "12:00 PM", status: "seen", log: [L("sent", "11:50 AM"), L("seen", "11:58 AM")] }),
    task({ id: 11, who: "olivia", title: "Write test cases for the invoice export", due: LATER, status: "accepted", confirm: true, needsOk: true,
      steps: steps(["Happy path", "Empty and huge files", "Wrong date formats"], 0),
      log: [Y("sent", "3:10 PM"), Y("seen", "3:22 PM"), Y("confirmed", "3:24 PM")] }),
    task({ id: 12, who: "arjun", title: "Rotate the staging database password", due: YEST, time: "5:00 PM", high: true, status: "accepted", confirm: true,
      log: [Y("sent", "10:15 AM"), Y("seen", "10:30 AM"), Y("confirmed", "10:31 AM")] }),
    task({ id: 13, who: "emily", title: "Update the Brightway project timeline", due: TODAY, time: "12:00 PM", status: "review", needsOk: true, note: "Timeline updated. Launch moves to Thu 12 Nov.", noteBy: "Emily",
      log: [L("sent", "9:35 AM"), L("seen", "9:41 AM"), L("started", "10:00 AM"), L("done", "11:40 AM", { text: "Timeline updated. Launch moves to Thu 12 Nov." })] }),
    task({ id: 14, who: "priya", title: "Send the October salary sheet to the CA", due: YEST, time: "5:00 PM", status: "approved", needsOk: true,
      log: [Y("sent", "9:00 AM"), Y("seen", "9:05 AM"), Y("started", "9:10 AM"), Y("done", "3:30 PM", { text: "Sent to the CA, copy in the shared folder." }), Y("approved", "4:02 PM")] }),
    task({ id: 15, who: "karan", title: "Log the Sunline call notes in the CRM", due: YEST, status: "done", log: [Y("sent", "11:00 AM"), Y("seen", "11:20 AM"), Y("started", "12:00 PM"), Y("done", "6:05 PM")] }),
    task({ id: 16, who: "olivia", title: "Smoke test the 2.4 release", due: TODAY, time: "12:00 PM", status: "done", steps: steps(["Login", "Checkout", "Reports"], 3),
      log: [L("sent", "9:10 AM"), L("seen", "9:12 AM"), L("started", "9:15 AM"), L("step", "10:05 AM", { text: "Login" }), L("step", "11:02 AM", { text: "Checkout" }), L("step", "11:45 AM", { text: "Reports" }), L("done", "11:48 AM")] }),
    task({ id: 17, who: "sneha", title: "Share the new logo files with Karan", due: YEST, status: "approved", needsOk: true,
      log: [Y("sent", "10:00 AM"), Y("seen", "10:05 AM"), Y("started", "10:06 AM"), Y("done", "10:40 AM"), Y("approved", "11:10 AM")] }),
    task({ id: 18, who: "emily", title: "Send the weekly status to Brightway", due: WEEK_AGO, time: "5:00 PM", status: "done",
      log: [W("sent", "9:00 AM"), W("seen", "9:20 AM"), W("started", "2:00 PM"), W("done", "4:30 PM")] }),
  ];
}

const store = sampleStore<SampleTask[]>(`tasks.${todayIso()}`, seed);

/** Fired after any sample task change, so the menu badge and other open views refresh. */
export const TASKS_CHANGED_EVENT = "zinwe:tasks-changed";
function changed(): void {
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}

/**
 * Lay the sample people onto the account's real active members (in order, wrapping). No members: keep the sample names.
 * A task created for a real member (memberId set, see createTask) stays with that member while they are active.
 */
export function withPeople(tasks: SampleTask[], members: readonly Member[] | undefined): SampleTask[] {
  const real = (members ?? []).filter((m) => m.is_active);
  if (!real.length) return tasks;
  const index = new Map(SAMPLE_PEOPLE.map((p, i) => [p.id, i]));
  return tasks.map((t) => {
    const own = t.memberId != null ? real.find((m) => m.id === t.memberId) : undefined;
    const m = own ?? real[(index.get(t.who) ?? 0) % real.length];
    return { ...t, memberId: m.id, name: m.name };
  });
}

/** The sample person key that withPeople lays onto the real member at `memberIndex` (for tasks created for real people). */
export function sampleKeyFor(memberIndex: number, memberCount: number): string {
  const hit = SAMPLE_PEOPLE.find((_, i) => memberCount > 0 && i % memberCount === memberIndex);
  return (hit ?? SAMPLE_PEOPLE[0]).id;
}

/** GET tasks (sample). Pass the members to show tasks against real people. */
export function listTasks(signal?: AbortSignal, members?: readonly Member[]): Promise<SampleTask[]> {
  return sample(withPeople(store.get(), members), signal);
}

/** PATCH a task (sample): approve, reopen, nudge, edit, move the due day… Returns the saved task. */
export function saveTask(id: number, patch: Partial<SampleTask>, logEntry?: Omit<TaskLogEntry, "day" | "time">): SampleTask | null {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  let saved: SampleTask | null = null;
  store.set(
    store.get().map((t) => {
      if (t.id !== id) return t;
      saved = { ...t, ...patch, log: logEntry ? [...t.log, { ...logEntry, day: todayIso(), time }] : (patch.log ?? t.log) };
      return saved;
    }),
  );
  changed();
  return saved;
}

/** POST a task (sample). `who` is a sample person key; `memberId` the real member when known. */
export function createTask(input: Pick<SampleTask, "who" | "title"> & Partial<SampleTask>): SampleTask {
  const all = store.get();
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const task: SampleTask = {
    id: Math.max(0, ...all.map((t) => t.id)) + 1,
    memberId: null,
    name: SAMPLE_PEOPLE.find((p) => p.id === input.who)?.name ?? input.who,
    details: "",
    due: todayIso(),
    time: "",
    high: false,
    status: "sent",
    steps: [],
    note: "",
    noteBy: "",
    confirm: false,
    needsOk: false,
    byMember: false,
    edited: false,
    email: false,
    nudgedAt: "",
    ...input,
    log: [{ k: "sent", day: todayIso(), time, email: !!input.email }],
  };
  store.set([...all, task]);
  changed();
  return task;
}

/** Tasks waiting for the owner's OK or help (the Tasks badge in DashNav). */
export function countTasksWaiting(): number {
  return store.get().filter((t) => t.status === "review" || t.status === "help").length;
}

/** DELETE a task (sample): "Cancel task". Returns the removed task (for Undo), or null. */
export function removeTask(id: number): SampleTask | null {
  const all = store.get();
  const hit = all.find((t) => t.id === id) ?? null;
  if (!hit) return null;
  store.set(all.filter((t) => t.id !== id));
  changed();
  return hit;
}

/** Put a task back exactly as it was (Undo after approve or cancel). */
export function restoreTask(task: SampleTask): void {
  const all = store.get();
  store.set(all.some((t) => t.id === task.id) ? all.map((t) => (t.id === task.id ? task : t)) : [...all, task]);
  changed();
}
