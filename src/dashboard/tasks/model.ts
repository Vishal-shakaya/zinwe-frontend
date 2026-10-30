/**
 * Task rules shared by the Tasks page, the task cards in Chat and Overview (boards DashTasks + DashChat).
 * Wording (logText, lastLine, labels) follows the boards. Data: the FR-20 v2 tasks API through ./types (toView).
 */
import type { Member } from "../../lib/api";
import { MEMBER_ROLES } from "../../lib/api";
import { PRESENCE_LABEL, presenceOf, type PresenceStatus } from "../features/memberStatus";
import { addDays, CLOSED, FINISHED, TASK_STATUS, todayIso, type TaskLogEntry, type TaskStatus, type TaskView } from "./types";

export const WKD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** Small tags on a card for the stages before they start (and the Nudge button). */
export const SUB: Partial<Record<TaskStatus, string>> = { sent: "Sent", seen: "Seen" };
/** Where each status sits on the stage bar. */
export const STAGE_OF: Record<TaskStatus, string> = {
  sent: "sent",
  seen: "seen",
  accepted: "accepted",
  progress: "progress",
  help: "progress",
  review: "done",
  approved: "approved",
  cancelled: "cancelled",
};
/** The API allows a nudge while they still have to finish it (once an hour). */
export const NUDGEABLE: readonly TaskStatus[] = ["sent", "seen", "accepted", "progress", "help"];

export const RED = { background: "#FCE8E4", color: "#C0331C" } as const;
export const AMBER = { background: "#FDEBDC", color: "#8A3A04" } as const;
export const NEUTRAL = { background: "#F5F5F5", color: "#404040" } as const;

export const TINTS = ["#FDEBDC", "#F5F5F5", "#FFF6EF", "#EEEEEE", "#FDEBDC", "#F5F5F5", "#FFF6EF", "#EEEEEE", "#FDEBDC", "#F5F5F5"] as const;

export const isFinished = (t: TaskView) => FINISHED.includes(t.status);
export const isClosed = (t: TaskView) => CLOSED.includes(t.status);
export const isOpenTask = (t: TaskView) => !CLOSED.includes(t.status);
/** Waiting on you: they asked for help, or finished and wait for your OK (the Tasks badge, Needs you). */
export const needsOwner = (t: TaskView) => t.status === "help" || t.status === "review";

const pad = (n: number) => String(n).padStart(2, "0");
export const isISO = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

export function fmtISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WKD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Minutes since midnight of "5:00 PM"; "" = end of the day. */
export function toMin(t: string): number {
  const m = /^(\d+):(\d+)\s*(AM|PM)$/.exec(t || "");
  if (!m) return 24 * 60 - 1;
  let h = Number(m[1]) % 12;
  if (m[3] === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

export function nowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function dayName(iso: string): string {
  const today = todayIso();
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  return fmtISO(iso);
}

/** Chat date separators: "Today", "Yesterday", "Wed, 23 Oct". */
export function sepLabel(iso: string): string {
  const today = todayIso();
  if (!iso || iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  const x = new Date(`${iso}T00:00:00`);
  return `${WKD[x.getDay()]}, ${x.getDate()} ${MON[x.getMonth()]}`;
}

/** Sort key by due day and time; no due date sorts last. */
export const dueKey = (t: TaskView) => (t.due ? `${t.due} ${pad(Math.floor(toMin(t.time) / 60))}${pad(toMin(t.time) % 60)}` : "9999-99-99 9999");

export function whenOf(e: TaskLogEntry): string {
  const today = todayIso();
  return (e.day === today ? "Today, " : e.day === addDays(today, -1) ? "Yesterday, " : `${fmtISO(e.day)}, `) + e.time;
}
export function whenShort(e: TaskLogEntry): string {
  const today = todayIso();
  return e.day === today ? e.time : e.day === addDays(today, -1) ? "yesterday" : fmtISO(e.day);
}
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function isOverdue(t: TaskView, today = todayIso(), now = nowMin()): boolean {
  if (isFinished(t) || !t.due) return false;
  if (t.due < today) return true;
  return t.due === today && toMin(t.time) < now;
}
export function isDueToday(t: TaskView): boolean {
  return t.due === todayIso() && !isFinished(t) && !isOverdue(t);
}

export function dueLabel(t: TaskView): string {
  if (!t.due) return "No due date";
  return (isOverdue(t) ? "Overdue · " : "") + dayName(t.due) + (t.time ? `, ${t.time}` : "");
}
export function dueStyle(t: TaskView): { background: string; color: string } {
  if (isOverdue(t)) return RED;
  return t.due === todayIso() && !isFinished(t) ? AMBER : NEUTRAL;
}
/** Who wrote a task's note: "You", or the person's first name. */
export function noteByOf(t: TaskView, first: string): string {
  return t.noteBy === "You" ? "You" : first;
}

export function statusStyle(s: TaskStatus): { background: string; color: string } {
  const st = TASK_STATUS[s];
  return { color: st[1], background: st[2] };
}

// ---- People: the account's active members ----

export interface TaskPerson {
  /** Route/hash key: first name in lower case (or the member id when two share a first name). */
  key: string;
  memberId: number | null;
  name: string;
  first: string;
  initials: string;
  tint: string;
  role: string;
  presence: string;
  presenceKind: PresenceStatus;
  pc: string;
  /** Their PC is connected: a message arrives right away. */
  pcOn: boolean;
  member: Member | null;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}
export const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

export function roleLabel(m: Member): string {
  return MEMBER_ROLES.find((r) => r.value === m.role)?.label ?? "Team member";
}

export function peopleOf(members: readonly Member[] | undefined): TaskPerson[] {
  const real = (members ?? []).filter((m) => m.is_active);
  const firsts = real.map((m) => firstOf(m.name).toLowerCase());
  return real.map((m, i) => {
    const kind = presenceOf(m.device);
    const first = firstOf(m.name);
    const unique = firsts.filter((f) => f === first.toLowerCase()).length === 1;
    return {
      key: unique ? first.toLowerCase() : String(m.id),
      memberId: m.id,
      name: m.name,
      first,
      initials: initialsOf(m.name),
      tint: TINTS[i % TINTS.length],
      role: roleLabel(m),
      presence: PRESENCE_LABEL[kind],
      presenceKind: kind,
      pc: m.device?.hostname || "No PC yet",
      pcOn: !!m.device?.is_online,
      member: m,
    };
  });
}

/** A deep link's person (#m=<first>, /app/chat/<first>, ?member=<id>): first name or member id. */
export function findPerson(raw: string | null | undefined, people: readonly TaskPerson[]): TaskPerson | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || !people.length) return null;
  return people.find((p) => p.key === v) ?? people.find((p) => String(p.memberId) === v) ?? people.find((p) => p.first.toLowerCase() === v) ?? null;
}

/** The person a task is for (a switched-off member still gets a name and initials). */
export function personOfTask(t: TaskView, people: readonly TaskPerson[]): TaskPerson {
  const hit = people.find((p) => p.memberId === t.memberId);
  if (hit) return hit;
  return {
    key: String(t.memberId),
    memberId: t.memberId,
    name: t.name,
    first: firstOf(t.name),
    initials: initialsOf(t.name),
    tint: TINTS[0],
    role: "",
    presence: "",
    presenceKind: "offline",
    pc: "",
    pcOn: false,
    member: null,
  };
}

// ---- Log lines (DashTasks LOGTXT / LOGDOT / lastLine) ----

export function logText(e: TaskLogEntry, f: string): string {
  switch (e.k) {
    case "sent":
      return "You sent it";
    case "seen":
      return `${f} saw it`;
    case "confirmed":
      return `${f} confirmed`;
    case "started":
      return `${f} started`;
    case "step":
      return `${f} ticked “${e.text ?? ""}”`;
    case "unstep":
      return `${f} unticked “${e.text ?? ""}”`;
    case "help":
      return `${f} marked it Needs help: “${e.text ?? ""}”`;
    case "done":
      return `${f} marked it done${e.text ? `: “${e.text}”` : ""}`;
    case "note":
      return `${f} added a note: “${e.text ?? ""}”`;
    case "approved":
      return `You approved it${e.text ? `: “${e.text}”` : ""}`;
    case "reopened":
      return e.text ? `You reopened it: “${e.text}”` : "You reopened it";
    case "cancelled":
      return "You cancelled it";
    case "nudged":
      return `You nudged ${f}`;
    case "edited":
      return "You edited the task";
    case "due":
      return "You moved the due date";
    default:
      return e.k;
  }
}

export const LOGDOT: Partial<Record<TaskLogEntry["k"], string>> = {
  help: "#A84505",
  done: "#17663F",
  approved: "#17663F",
  reopened: "#C0331C",
  cancelled: "#C0331C",
  nudged: "#F26A0A",
  note: "#404040",
  edited: "#6B6B6B",
  due: "#6B6B6B",
};

export function lastLine(t: TaskView, f: string, pcOn: boolean): string {
  const e = t.log[t.log.length - 1];
  if (!e) return "";
  const w = whenShort(e);
  switch (e.k) {
    case "sent":
      return `Sent ${w}${!pcOn ? " · PC offline" : ""}`;
    case "seen":
      return `Seen ${w}`;
    case "confirmed":
      return `Confirmed ${w}`;
    case "started":
      return `Started ${w}`;
    case "step":
      return `Ticked “${clip(e.text ?? "", 24)}” · ${w}`;
    case "unstep":
      return `Unticked “${clip(e.text ?? "", 24)}” · ${w}`;
    case "help":
      return `${f}: “${clip(e.text ?? "", 40)}”`;
    case "done":
      return e.text ? `${f}: “${clip(e.text, 40)}”` : `Done ${w}`;
    case "note":
      return `${f}: “${clip(e.text ?? "", 40)}”`;
    case "approved":
      return `You approved · ${w}`;
    case "reopened":
      return `Reopened ${w}`;
    case "cancelled":
      return `Cancelled ${w}`;
    case "nudged":
      return `Nudged ${w}`;
    case "edited":
      return `Edited ${w}`;
    case "due":
      return `Due moved ${w}`;
    default:
      return w;
  }
}

// ---- Stage trackers ----

export interface TrackStep {
  key: string;
  label: string;
  reached: boolean;
  current: boolean;
  help: boolean;
  awaitingOk: boolean;
  green: boolean;
  when: string;
}

function stagesOf(t: TaskView): Array<[string, string]> {
  const stages: Array<[string, string]> = [["sent", "Sent"], ["seen", "Seen"]];
  if (t.confirm) stages.push(["accepted", "Confirmed"]);
  stages.push(["progress", "In progress"], ["done", "Done"], ["approved", "Approved"]);
  return stages;
}

/** Sent → Seen → (Confirmed) → In progress → Done → Approved. A cancelled task reaches none of them. */
export function trackOf(t: TaskView): TrackStep[] {
  const stages = stagesOf(t);
  const cur = stages.findIndex(([k]) => k === STAGE_OF[t.status]);
  const LOGK: Record<string, string[]> = { sent: ["sent"], seen: ["seen"], accepted: ["confirmed"], progress: ["started"], done: ["done"], approved: ["approved"] };
  const stampOf = (k: string) => {
    const hits = t.log.filter((e) => LOGK[k]?.includes(e.k));
    const e = k === "done" || k === "approved" ? hits[hits.length - 1] : hits[0];
    return e ? whenOf(e).replace("Today, ", "") : "";
  };
  return stages.map(([k, label], i) => {
    const help = t.status === "help" && k === "progress";
    const awaitingOk = t.status === "review" && k === "approved";
    const reached = cur >= 0 && i <= cur;
    return {
      key: k,
      label: help ? "Needs help" : label,
      reached,
      current: i === cur,
      help,
      awaitingOk,
      green: k === "done" || k === "approved",
      when: help ? stampOf("progress") : awaitingOk ? "Waiting for you" : reached ? stampOf(k) : "",
    };
  });
}

/** The stage bars on the chat card (DashChat track). */
export function chatTrackOf(t: TaskView): TrackStep[] {
  const stages = stagesOf(t);
  const cur = stages.findIndex(([k]) => k === STAGE_OF[t.status]);
  return stages.map(([k, label], i) => {
    const help = t.status === "help" && k === "progress";
    return { key: k, label: help ? "Needs help" : label, reached: cur >= 0 && i <= cur, current: i === cur, help, awaitingOk: t.status === "review" && k === "approved", green: k === "done" || k === "approved", when: "" };
  });
}

/** "More options" summary line under the toggle in the task form. */
export function moreSummary(f: { details: string; time: string; high: boolean; steps: string[] }): string {
  const bits: string[] = [];
  if (f.details.trim()) bits.push("Details added");
  if (f.time) bits.push(`By ${f.time}`);
  if (f.high) bits.push("High priority");
  if (f.steps.length) bits.push(`${f.steps.length}${f.steps.length === 1 ? " step" : " steps"}`);
  return bits.length ? bits.join(" · ") : "Details, time, priority, checklist";
}
