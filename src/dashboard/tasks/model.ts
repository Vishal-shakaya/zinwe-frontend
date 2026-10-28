/**
 * Task rules shared by the Tasks page and the task cards in Chat (boards DashTasks + DashChat).
 * Wording (LOGTXT, lastLine, labels) is copied word for word from the boards. "Today" and "now" are real.
 */
import type { Member } from "../../lib/api";
import { MEMBER_ROLES } from "../../lib/api";
import { PRESENCE_LABEL, presenceOf, type PresenceStatus } from "../features/memberStatus";
import {
  addDays,
  CLOSED,
  FINISHED,
  SAMPLE_PEOPLE,
  TASK_STATUS,
  todayIso,
  type SampleTask,
  type TaskLogEntry,
  type TaskStatus,
} from "../fixtures/tasks";

export const WKD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

export const SUB: Partial<Record<TaskStatus, string>> = { sent: "Sent", seen: "Seen", waiting: "Waiting to confirm" };
export const STAGE_OF: Record<TaskStatus, string> = {
  sent: "sent",
  seen: "seen",
  waiting: "seen",
  accepted: "accepted",
  progress: "progress",
  help: "progress",
  done: "done",
  review: "done",
  approved: "approved",
};

export const RED = { background: "#FCE8E4", color: "#B02A15" } as const;
export const AMBER = { background: "#FFF1E6", color: "#8A3A04" } as const;
export const NEUTRAL = { background: "#F2EFE8", color: "#3A352E" } as const;

export const TINTS = ["#FDEBDC", "#E6EEFB", "#E3F4EA", "#F4ECFB", "#FBF0D9", "#F2EFE8", "#E6EEFB", "#E3F4EA", "#FDEBDC", "#F4ECFB"] as const;

export const isFinished = (t: SampleTask) => FINISHED.includes(t.status);
export const isClosed = (t: SampleTask) => CLOSED.includes(t.status);
export const isOpenTask = (t: SampleTask) => !CLOSED.includes(t.status);

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

export function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

export const dueKey = (t: SampleTask) => `${t.due} ${pad(Math.floor(toMin(t.time) / 60))}${pad(toMin(t.time) % 60)}`;

export function whenOf(e: TaskLogEntry): string {
  const today = todayIso();
  return (e.day === today ? "Today, " : e.day === addDays(today, -1) ? "Yesterday, " : `${fmtISO(e.day)}, `) + e.time;
}
export function whenShort(e: TaskLogEntry): string {
  const today = todayIso();
  return e.day === today ? e.time : e.day === addDays(today, -1) ? "yesterday" : fmtISO(e.day);
}
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** When a log entry happened, as a Date (to place a task card in the chat). */
export function entryDate(e: { day: string; time: string }): Date {
  const m = toMin(e.time);
  const d = new Date(`${e.day}T00:00:00`);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

export function isOverdue(t: SampleTask, today = todayIso(), now = nowMin()): boolean {
  if (isFinished(t)) return false;
  if (t.due < today) return true;
  return t.due === today && toMin(t.time) < now;
}
export function isDueToday(t: SampleTask): boolean {
  return t.due === todayIso() && !isFinished(t) && !isOverdue(t);
}

export function dueLabel(t: SampleTask): string {
  return (isOverdue(t) ? "Overdue · " : "") + dayName(t.due) + (t.time ? `, ${t.time}` : "");
}
export function dueStyle(t: SampleTask): { background: string; color: string } {
  if (isOverdue(t)) return RED;
  return t.due === todayIso() && !isFinished(t) ? AMBER : NEUTRAL;
}
/** Who wrote a task's note: "You", or the person (the sample's own names become the real person's first name). */
export function noteByOf(t: SampleTask, first: string): string {
  return t.noteBy === "You" ? "You" : first;
}

export function statusStyle(s: TaskStatus): { background: string; color: string } {
  const st = TASK_STATUS[s];
  return { color: st[1], background: st[2] };
}

// ---- People: the real members (or the sample team when the account has none). ----

export interface TaskPerson {
  /** Route/hash key: first name in lower case (or the member id when two share a first name). */
  key: string;
  memberId: number | null;
  /** Sample person key the fixture uses for this person. */
  sampleKey: string;
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
  if (!real.length) {
    return SAMPLE_PEOPLE.map((p, i) => ({
      key: p.id,
      memberId: null,
      sampleKey: p.id,
      name: p.name,
      first: firstOf(p.name),
      initials: initialsOf(p.name),
      tint: TINTS[i % TINTS.length],
      role: p.role,
      presence: p.presence,
      presenceKind: p.presence === "Working" ? "working" : p.pcOn ? "online" : "offline",
      pc: p.pc,
      pcOn: p.pcOn,
      member: null,
    }));
  }
  const firsts = real.map((m) => firstOf(m.name).toLowerCase());
  return real.map((m, i) => {
    const kind = presenceOf(m.device);
    const first = firstOf(m.name);
    const unique = firsts.filter((f) => f === first.toLowerCase()).length === 1;
    return {
      key: unique ? first.toLowerCase() : String(m.id),
      memberId: m.id,
      sampleKey: SAMPLE_PEOPLE[i % SAMPLE_PEOPLE.length].id,
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

/**
 * A deep link's person (#m=<first>, /app/chat/<first>, ?member=<id>): first name, member id, or a sample
 * person's first name (the boards' links, e.g. #m=emily), laid onto the real member the sample uses.
 */
export function findPerson(raw: string | null | undefined, people: readonly TaskPerson[]): TaskPerson | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || !people.length) return null;
  const direct = people.find((p) => p.key === v) ?? people.find((p) => String(p.memberId) === v) ?? people.find((p) => p.first.toLowerCase() === v);
  if (direct) return direct;
  const sampleIndex = SAMPLE_PEOPLE.findIndex((p) => p.id === v.split("-")[0]);
  return sampleIndex >= 0 ? people[sampleIndex % people.length] : null;
}

export function personOfTask(t: SampleTask, people: readonly TaskPerson[]): TaskPerson {
  const hit = (t.memberId != null ? people.find((p) => p.memberId === t.memberId) : undefined) ?? people.find((p) => p.sampleKey === t.who && p.memberId === null);
  if (hit) return hit;
  const name = t.name || t.who;
  return {
    key: t.who,
    memberId: t.memberId,
    sampleKey: t.who,
    name,
    first: firstOf(name),
    initials: initialsOf(name),
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
      return `You sent it${e.email ? " by chat + email" : ""}`;
    case "added":
      return `${f} added it for themselves`;
    case "seen":
      return `${f} saw it`;
    case "confirmed":
      return `${f} confirmed`;
    case "started":
      return `${f} started`;
    case "step":
      return `${f} ticked “${e.text ?? ""}”`;
    case "help":
      return `${f} marked it Needs help: “${e.text ?? ""}”`;
    case "done":
      return `${f} marked it done${e.text ? `: “${e.text}”` : ""}`;
    case "approved":
      return "You approved it";
    case "reopened":
      return `You reopened it: “${e.text ?? ""}”`;
    case "nudged":
      return `You nudged ${f}`;
    case "edited":
      return "You edited the task";
    case "reply":
      return `You replied: “${e.text ?? ""}”`;
    case "due":
      return "You moved the due date to tomorrow";
    default:
      return e.k;
  }
}

export const LOGDOT: Partial<Record<TaskLogEntry["k"], string>> = {
  help: "#8A5300",
  done: "#17663F",
  approved: "#17663F",
  reopened: "#B02A15",
  nudged: "#F26A0A",
  reply: "#F26A0A",
  edited: "#6B6358",
  due: "#6B6358",
};

export function lastLine(t: SampleTask, f: string, pcOn: boolean): string {
  const e = t.log[t.log.length - 1];
  if (!e) return "";
  const w = whenShort(e);
  switch (e.k) {
    case "sent":
      return `Sent ${w}${!pcOn ? " · PC offline" : ""}`;
    case "added":
      return `Added ${w}`;
    case "seen":
      return `Seen ${w}`;
    case "confirmed":
      return `Confirmed ${w}`;
    case "started":
      return `Started ${w}`;
    case "step":
      return `Ticked “${clip(e.text ?? "", 24)}” · ${w}`;
    case "help":
      return `${f}: “${clip(e.text ?? "", 40)}”`;
    case "done":
      return e.text ? `${f}: “${clip(e.text, 40)}”` : `Done ${w}`;
    case "approved":
      return `You approved · ${w}`;
    case "reopened":
      return `Reopened ${w}`;
    case "nudged":
      return `Nudged ${w}`;
    case "edited":
      return `Edited ${w}`;
    case "reply":
      return `You: “${clip(e.text ?? "", 40)}”`;
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

/** Sent → Seen → (Confirmed) → In progress → Done → (Approved). */
export function trackOf(t: SampleTask): TrackStep[] {
  const stages: Array<[string, string]> = t.byMember ? [["sent", "Added"]] : [["sent", "Sent"], ["seen", "Seen"]];
  if (t.confirm) stages.push(["accepted", "Confirmed"]);
  stages.push(["progress", "In progress"], ["done", "Done"]);
  if (t.needsOk) stages.push(["approved", "Approved"]);
  const cur = Math.max(0, stages.findIndex(([k]) => k === STAGE_OF[t.status]));
  const LOGK: Record<string, string[]> = { sent: ["sent", "added"], seen: ["seen"], accepted: ["confirmed"], progress: ["started"], done: ["done"], approved: ["approved"] };
  const stampOf = (k: string) => {
    const hits = t.log.filter((e) => LOGK[k]?.includes(e.k));
    const e = k === "done" || k === "approved" ? hits[hits.length - 1] : hits[0];
    return e ? whenOf(e).replace("Today, ", "") : "";
  };
  return stages.map(([k, label], i) => {
    const help = t.status === "help" && k === "progress";
    const awaitingOk = t.status === "review" && k === "approved";
    const reached = i <= cur;
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

/** The person's own stage in the chat card (DashChat track: bars). */
export function chatTrackOf(t: SampleTask): TrackStep[] {
  const stages: Array<[string, string]> = [["sent", "Sent"], ["seen", "Seen"]];
  if (t.confirm) stages.push(["accepted", "Confirmed"]);
  stages.push(["progress", "In progress"], ["done", "Done"]);
  if (t.needsOk) stages.push(["approved", "Approved"]);
  const cur = stages.findIndex(([k]) => k === STAGE_OF[t.status]);
  return stages.map(([k, label], i) => {
    const help = t.status === "help" && k === "progress";
    return { key: k, label: help ? "Needs help" : label, reached: i <= cur, current: i === cur, help, awaitingOk: false, green: k === "done" || k === "approved", when: "" };
  });
}

/** "More options" summary line under the toggle in the task form. */
export function moreSummary(f: { details: string; time: string; high: boolean; steps: string[]; ok: boolean; confirm: boolean; email: boolean }): string {
  const bits: string[] = [];
  if (f.details.trim()) bits.push("Details added");
  if (f.time) bits.push(`By ${f.time}`);
  if (f.high) bits.push("High priority");
  if (f.steps.length) bits.push(`${f.steps.length}${f.steps.length === 1 ? " step" : " steps"}`);
  if (f.ok) bits.push("Needs your OK");
  if (f.confirm) bits.push("Confirm first");
  if (f.email) bits.push("Also by email");
  return bits.length ? bits.join(" · ") : "Details, time, priority, checklist, sign-off, email";
}
