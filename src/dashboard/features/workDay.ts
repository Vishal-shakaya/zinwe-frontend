/**
 * Turns one day's work-log entries (started / break / back / ended) into a
 * per-person summary for the Activity page: when they started and ended, each
 * break with its reason and length, and the time worked.
 *
 * FIX-011: the day's figures (time worked, time on breaks, breaks, forgotten log-out) come from the server's
 * `totals`, which split a stretch that crosses midnight between the two days the same way reports do. A stretch
 * still running at this day's midnight (`carried_in`) starts the timeline at 00:00. An older API without `totals`
 * falls back to counting this day's entries here (the old behaviour: time before midnight is lost).
 */
import type { WorkDayTotal, WorkLogEntry } from "../../lib/api";

export interface BreakSpan {
  /** The work-log entry id (for approve / deny). */
  id: number;
  start: string;
  /** null while the break is still going (today). */
  end: string | null;
  reason: string;
  note: string;
  approval: "" | "pending" | "approved" | "denied";
  decisionNote: string;
  seconds: number;
}

/** A log-out, approved or questioned like a break (FR-16). */
export interface LogoutSpan {
  id: number;
  at: string;
  reason: string;
  note: string;
  approval: "" | "pending" | "approved" | "denied";
  decisionNote: string;
}

export interface TimelineItem {
  at: string;
  /** "carry" = a stretch from the day before, still running at midnight (shown at 00:00). "moved" = the day went to another PC. */
  kind: "carry" | "start" | "break" | "back" | "end" | "moved";
  reason: string;
  /** Log out: the message the member added in the widget (breaks keep theirs on the BreakSpan). */
  note?: string;
  /** "carry" only: when that stretch began yesterday, and what they were doing. */
  since?: string;
  state?: WorkLogEntry["state"];
  /** "moved" only: the PC it went to and the PC it left, and when that PC was last heard from if it had gone quiet. */
  to?: string;
  from?: string;
  leftOff?: string | null;
}

/** Yesterday's stretch that was still running at this day's midnight. */
export interface CarriedIn {
  at: string;
  state: "working" | "on_break";
  reason: string;
}

export interface PersonDay {
  key: string;
  memberId: number | null;
  name: string;
  /** The PC the day began on. */
  hostname: string;
  /** The PC the day is on now (its day may have moved between PCs). */
  lastHostname: string;
  /** The first log-in this day; null when the day began with last night's shift still running (see carriedIn). */
  startedAt: string | null;
  endedAt: string | null;
  breaks: BreakSpan[];
  /** Every log-out that day (they may log in again), for approval. */
  logouts: LogoutSpan[];
  /** Breaks that began this day. */
  breakCount: number;
  breakSeconds: number;
  workedSeconds: number;
  /** A stretch began this day that couldn't be counted (they never logged out): the time after it isn't counted. */
  openEnded: boolean;
  /** When the uncounted stretch began (the person's last change that day), for the plain-English note. */
  openEndedFrom: string | null;
  /** The day's last stretch runs on past midnight into the next day. */
  continues: boolean;
  carriedIn: CarriedIn | null;
  current: "working" | "on_break" | "ended" | null;
  /** The figures are the server's split-at-midnight totals (false on an older API). */
  fromServer: boolean;
  timeline: TimelineItem[];
}

function seconds(fromIso: string, toMs: number): number {
  return Math.max(0, Math.round((toMs - Date.parse(fromIso)) / 1000));
}

function personKey(entry: Pick<WorkLogEntry, "member_id" | "device_id">): string {
  return entry.member_id != null ? `m${entry.member_id}` : `d${entry.device_id}`;
}

/** Local midnight at the start of `day` (yyyy-mm-dd), as an ISO string. */
function midnightOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export interface DaySource {
  /** yyyy-mm-dd. */
  date: string;
  entries: WorkLogEntry[];
  carried_in?: WorkLogEntry[];
  totals?: WorkDayTotal[];
}

export function summarizeDay(log: DaySource, isToday: boolean, now: number): PersonDay[] {
  const byPerson = new Map<string, WorkLogEntry[]>();
  for (const entry of log.entries) {
    const key = personKey(entry);
    const list = byPerson.get(key) ?? [];
    list.push(entry);
    byPerson.set(key, list);
  }
  const totals = new Map((log.totals ?? []).map((t) => [t.key, t] as const));
  const carriedById = new Map((log.carried_in ?? []).map((e) => [e.id, e] as const));
  const carriedFor = (key: string): WorkLogEntry | undefined => {
    const id = totals.get(key)?.carried_in;
    return id != null ? carriedById.get(id) : (log.carried_in ?? []).find((e) => personKey(e) === key);
  };
  // Someone whose only part of the day is last night's shift running on (no change today) still has a row.
  for (const entry of log.carried_in ?? []) {
    const key = personKey(entry);
    if (!byPerson.has(key) && totals.has(key)) byPerson.set(key, []);
  }
  const midnight = midnightOf(log.date);

  const days: PersonDay[] = [];
  for (const [key, list] of byPerson) {
    list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const carried = carriedFor(key);
    const sample = list[0] ?? carried;
    if (!sample) continue;
    const day: PersonDay = {
      key,
      memberId: sample.member_id,
      name: sample.member_name || sample.hostname || "Unknown PC",
      hostname: sample.hostname,
      lastHostname: list[list.length - 1]?.hostname ?? sample.hostname,
      startedAt: null,
      endedAt: null,
      breaks: [],
      logouts: [],
      breakCount: 0,
      breakSeconds: 0,
      workedSeconds: 0,
      openEnded: false,
      openEndedFrom: null,
      continues: false,
      carriedIn: null,
      current: null,
      fromServer: false,
      timeline: [],
    };

    if (carried && carried.state !== "ended") {
      day.carriedIn = { at: carried.at, state: carried.state, reason: carried.reason ?? "" };
      day.current = carried.state;
      day.timeline.push({ at: midnight, kind: "carry", reason: carried.reason ?? "", since: carried.at, state: carried.state });
    }

    list.forEach((entry, i) => {
      const next = list[i + 1];
      const until = next ? Date.parse(next.at) : isToday && entry.state !== "ended" ? now : null;
      if (!next && !isToday && entry.state !== "ended") {
        day.openEnded = true;
        day.openEndedFrom = entry.at;
      }

      // Logged in: the first change of the day, as before; when last night's shift ran on past midnight, only a
      // real new log-in (after a log-out) counts, so "back from break" at 00:30 isn't a start.
      if (day.startedAt === null && entry.state !== "ended") {
        if (!day.carriedIn || entry.previous_state === "ended" || entry.previous_state === "") day.startedAt = entry.at;
      }

      if (entry.state === "working") {
        // A move is not a new start: the day carries on, on another PC.
        if (entry.moved_from) {
          day.timeline.push({ at: entry.at, kind: "moved", reason: "", to: entry.hostname, from: entry.moved_from, leftOff: entry.left_off_at });
        } else {
          day.timeline.push({ at: entry.at, kind: entry.previous_state === "on_break" ? "back" : "start", reason: "" });
        }
        if (until !== null) day.workedSeconds += seconds(entry.at, until);
      } else if (entry.state === "on_break") {
        const span = until !== null ? seconds(entry.at, until) : 0;
        day.breaks.push({
          id: entry.id,
          start: entry.at,
          end: next ? next.at : null,
          reason: entry.reason,
          note: entry.note ?? "",
          approval: entry.approval ?? "",
          decisionNote: entry.decision_note ?? "",
          seconds: span,
        });
        day.breakSeconds += span;
        day.timeline.push({ at: entry.at, kind: "break", reason: entry.reason });
      } else {
        day.endedAt = entry.at;
        day.logouts.push({
          id: entry.id,
          at: entry.at,
          reason: entry.reason ?? "",
          note: entry.note ?? "",
          approval: entry.approval ?? "",
          decisionNote: entry.decision_note ?? "",
        });
        // Logging out carries the reason + note the member gave in the widget (older agents send none).
        day.timeline.push({ at: entry.at, kind: "end", reason: entry.reason ?? "", note: entry.note ?? "" });
      }
      day.current = entry.state;
    });
    day.breakCount = day.breaks.length;
    // "Ended" only if it's the last thing they did (they may have started again).
    if (day.current !== "ended") day.endedAt = null;

    // The server's figures, split at midnight like reports (FIX-011).
    const total = totals.get(key);
    if (total) {
      day.fromServer = true;
      day.workedSeconds = total.worked_seconds;
      day.breakSeconds = total.break_seconds;
      day.breakCount = total.breaks;
      day.openEnded = total.open_ended;
      if (!total.open_ended) day.openEndedFrom = null;
      day.continues = total.continues;
    }
    days.push(day);
  }
  const order = (p: PersonDay) => Date.parse(p.startedAt ?? (p.carriedIn ? midnight : "")) || Number.MAX_SAFE_INTEGER;
  return days.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
}

/** yyyy-mm-dd for a local date. */
export function isoDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDay(new Date(y, m - 1, d + days));
}
