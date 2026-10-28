/**
 * DashTeam data rules: the card status (Working / On break / Day ended / Not in / Invite sent), the status
 * tooltip's "since when" rows (from today's work log, the same times Activity shows), the filters, and each
 * person's last 7 days from the team report (active time, worked, internet data).
 */
import { toWorkState, type Device, type Member, type TeamReport } from "../../lib/api";
import type { PersonDay } from "../features/workDay";
import { hm } from "./format";

export type CardStatus = "working" | "break" | "out" | "notin" | "invited";

/** [label, pill class, tooltip square colour, what it means]. */
export const STATUS: Record<CardStatus, { label: string; pill: string; sq: string; means: string }> = {
  working: { label: "Working", pill: "green", sq: "#17663F", means: "Started their day and is at work now." },
  break: { label: "On break", pill: "amber", sq: "#8A5300", means: "Took a break. Their work day is paused." },
  out: { label: "Day ended", pill: "", sq: "#6B6358", means: "Ended their day. Time stopped counting." },
  notin: { label: "Not in", pill: "", sq: "#6B6358", means: "Hasn’t started a day yet today." },
  invited: { label: "Invite sent", pill: "blue", sq: "#1B4FB0", means: "Waiting for them to install Zinwe and agree." },
};

/**
 * No PC yet → Invite sent. PC online → what it last said (working, on a break, ended, not started).
 * PC offline → today's work log decides between Day ended and Not in (an offline PC can't be "working").
 */
export function cardStatus(member: Member, today: PersonDay | undefined): CardStatus {
  const pc = member.device;
  if (!pc) return "invited";
  if (pc.is_online) {
    const s = toWorkState(pc.work_state);
    if (s === "working") return "working";
    if (s === "on_break") return "break";
    if (s === "ended") return "out";
    return today?.current === "ended" ? "out" : "notin";
  }
  return today?.current === "ended" ? "out" : "notin";
}

/** The status tooltip's rows, e.g. [["Day started", "9:32 AM"], ["On break since", "1:38 PM"]]. */
export function statusRows(member: Member, status: CardStatus, today: PersonDay | undefined, now: number): [string, string][] {
  if (status === "invited") {
    const added = new Date(member.created_at);
    const sameDay = new Date(now).toDateString() === added.toDateString();
    return [["Invite sent", sameDay ? "Today" : added.toLocaleDateString("en-GB", { day: "numeric", month: "short" })]];
  }
  const rows: [string, string][] = [];
  if (today?.startedAt) rows.push(["Day started", hm(today.startedAt)]);
  else if (today?.carriedIn) rows.push(["Day started", "Yesterday"]);
  if (status === "break") {
    const open = today?.breaks.find((b) => !b.end);
    if (open) rows.push(["On break since", hm(open.start)]);
  }
  if (status === "out" && today?.endedAt) rows.push(["Ended day", hm(today.endedAt)]);
  if (!rows.length && member.device?.last_seen_at) {
    const seen = new Date(member.device.last_seen_at);
    rows.push(["Last seen", seen.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })]);
  }
  return rows;
}

export type TeamFilter = "all" | "online" | "offline" | "invited";

export const FILTERS: ReadonlyArray<readonly [TeamFilter, string]> = [
  ["all", "All"],
  ["online", "PC online"],
  ["offline", "PC offline"],
  ["invited", "Invited"],
];

export function inFilter(member: Member, filter: TeamFilter): boolean {
  if (filter === "all") return true;
  if (filter === "online") return Boolean(member.device?.is_online);
  if (filter === "offline") return Boolean(member.device) && !member.device?.is_online;
  return !member.device;
}

const PLATFORM_LABEL: Record<string, string> = { windows: "Windows", linux: "Linux", macos: "macOS" };

/** "Windows 11" from "Windows 11 Home 24H2 (26100)"; the platform when the OS string is missing. */
export function systemShort(device: Device | undefined): string {
  if (!device) return "";
  const os = device.os_version.trim();
  const m = /^(Windows \d+|Windows Server \d+|macOS|Linux)/i.exec(os);
  if (m) return m[1];
  return PLATFORM_LABEL[device.platform] ?? device.platform ?? "";
}

/** The full OS line for the PC tooltip. */
export function systemFull(device: Device | undefined): string {
  if (!device) return "";
  const platform = PLATFORM_LABEL[device.platform] ?? device.platform;
  const os = device.os_version.trim();
  if (!os) return platform;
  return os.toLowerCase().startsWith(platform.toLowerCase()) ? os : `${platform} ${os}`;
}

export interface WeekDay {
  /** yyyy-mm-dd. */
  date: string;
  activeSeconds: number;
  workedSeconds: number;
}

export interface MemberWeek {
  days: WeekDay[];
  activeSeconds: number;
  dataBytes: number;
}

/** One person's last 7 days (oldest first, today last) from the team report. */
export function weekOf(report: TeamReport | undefined, memberId: number, dates: readonly string[]): MemberWeek | undefined {
  if (!report) return undefined;
  const byDate = new Map(report.daily.map((d) => [d.date, d] as const));
  const days = dates.map((date) => {
    const row = byDate.get(date)?.by_person?.find((p) => p.member_id === memberId);
    return { date, activeSeconds: row?.active_seconds ?? 0, workedSeconds: row?.worked_seconds ?? 0 };
  });
  const person = report.people.find((p) => p.member_id === memberId);
  return {
    days,
    activeSeconds: days.reduce((sum, d) => sum + d.activeSeconds, 0),
    dataBytes: person?.data_bytes ?? 0,
  };
}

/**
 * The one playful tag a card shows: of the tags a person earned, the one the fewest teammates share (ties keep
 * the API's order, which is tags.py order).
 */
export function bestTagKey(mine: readonly { key: string }[], counts: ReadonlyMap<string, number>): string | null {
  let best: string | null = null;
  for (const t of mine) {
    if (best === null || (counts.get(t.key) ?? 0) < (counts.get(best) ?? 0)) best = t.key;
  }
  return best;
}
