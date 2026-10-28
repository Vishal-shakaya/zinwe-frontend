/** Helpers shared by the three Protection boards (kept apart from the components for fast refresh). */
import type { DeviceEvent } from "../../lib/api";
import { severityOf, type Severity } from "../features/events";

export const DAY_MS = 86_400_000;

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Events that happened inside the last `days` (the range the page shows). */
export function withinDays(events: readonly DeviceEvent[], days: number, now: number): DeviceEvent[] {
  const from = now - days * DAY_MS;
  return events.filter((e) => {
    const at = Date.parse(e.occurred_at);
    return Number.isFinite(at) && at >= from;
  });
}

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today 2:15 PM", "Yesterday 5:30 PM", "Thu 22 Oct 6:02 PM" (the boards' when column). */
export function whenText(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const clock = timeFmt.format(at).replace(/\s?am$/i, " AM").replace(/\s?pm$/i, " PM");
  const today = startOfDay(now);
  if (at >= today) return `Today ${clock}`;
  if (at >= today - DAY_MS) return `Yesterday ${clock}`;
  return `${dayFmt.format(at).replace(",", "")} ${clock}`;
}

/** The boards' three levels, from an alert's severity. */
export const LEVEL: Record<Severity, { label: string; cls: string; def: string }> = {
  critical: { label: "Needs you", cls: "red", def: "a transfer over your limit, a remote-control session, or anything blocked that someone tried again." },
  warning: { label: "Worth a look", cls: "amber", def: "small copies, new software, and blocked sites." },
  info: { label: "Info", cls: "blue", def: "normal activity, nothing to do." },
};

export function levelOf(event: DeviceEvent): (typeof LEVEL)[Severity] {
  return LEVEL[severityOf(event)];
}
