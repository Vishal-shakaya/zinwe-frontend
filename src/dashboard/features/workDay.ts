/**
 * Turns one day's work-log entries (started / break / back / ended) into a
 * per-person summary for the Activity page: when they started and ended, each
 * break with its reason and length, and the time worked.
 *
 * A segment runs from one change to the next. The last one is still running
 * when the day is today (it runs to "now"); on a past day an open segment means
 * the person never pressed End, so it isn't counted and the day is flagged.
 */
import type { WorkLogEntry } from "../../lib/api";

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

export interface TimelineItem {
  at: string;
  kind: "start" | "break" | "back" | "end";
  reason: string;
}

export interface PersonDay {
  key: string;
  memberId: number | null;
  name: string;
  hostname: string;
  startedAt: string | null;
  endedAt: string | null;
  breaks: BreakSpan[];
  breakSeconds: number;
  workedSeconds: number;
  /** Past day with no End pressed: the last stretch couldn't be counted. */
  openEnded: boolean;
  current: "working" | "on_break" | "ended" | null;
  timeline: TimelineItem[];
}

function seconds(fromIso: string, toMs: number): number {
  return Math.max(0, Math.round((toMs - Date.parse(fromIso)) / 1000));
}

export function summarizeDay(entries: WorkLogEntry[], isToday: boolean, now: number): PersonDay[] {
  const byPerson = new Map<string, WorkLogEntry[]>();
  for (const entry of entries) {
    const key = entry.member_id != null ? `m${entry.member_id}` : `d${entry.device_id}`;
    const list = byPerson.get(key) ?? [];
    list.push(entry);
    byPerson.set(key, list);
  }

  const days: PersonDay[] = [];
  for (const [key, list] of byPerson) {
    list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const day: PersonDay = {
      key,
      memberId: list[0].member_id,
      name: list[0].member_name || list[0].hostname || "Unknown PC",
      hostname: list[0].hostname,
      startedAt: null,
      endedAt: null,
      breaks: [],
      breakSeconds: 0,
      workedSeconds: 0,
      openEnded: false,
      current: null,
      timeline: [],
    };

    list.forEach((entry, i) => {
      const next = list[i + 1];
      const until = next ? Date.parse(next.at) : isToday && entry.state !== "ended" ? now : null;
      if (!next && !isToday && entry.state !== "ended") day.openEnded = true;

      if (entry.state === "working") {
        if (day.startedAt === null) day.startedAt = entry.at;
        day.timeline.push({ at: entry.at, kind: entry.previous_state === "on_break" ? "back" : "start", reason: "" });
        if (until !== null) day.workedSeconds += seconds(entry.at, until);
      } else if (entry.state === "on_break") {
        if (day.startedAt === null) day.startedAt = entry.at;
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
        day.timeline.push({ at: entry.at, kind: "end", reason: "" });
      }
      day.current = entry.state;
    });
    // "Ended" only if it's the last thing they did (they may have started again).
    if (day.current !== "ended") day.endedAt = null;
    days.push(day);
  }
  return days.sort((a, b) => Date.parse(a.startedAt ?? "") - Date.parse(b.startedAt ?? "") || a.name.localeCompare(b.name));
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
