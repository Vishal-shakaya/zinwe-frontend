/**
 * Makes the alert list readable: a plain detail line per alert (the tool,
 * website or app involved), and repeats of the same alert on the same PC
 * folded into one row ("UltraViewer ×6 in 40 min").
 */
import type { DeviceEvent } from "../../lib/api";

/** Repeats of one alert this close together fold into one row. */
const FOLD_WITHIN_MS = 2 * 60 * 60 * 1000;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The thing the alert is about, e.g. "UltraViewer", "youtube.com", "Microsoft OneDrive". */
export function subjectOf(event: DeviceEvent): string | null {
  const d = event.data ?? {};
  return (
    str(d.tool) ?? str(d.product) ?? str(d.domain) ?? str(d.host) ?? str(d.device_name) ?? str(d.drive) ?? str(d.app) ?? null
  );
}

/** One short line under the alert name: the agent's own summary when it sent one. */
export function detailOf(event: DeviceEvent): string {
  const d = event.data ?? {};
  const summary = str(d.summary);
  if (summary) return summary.replace(/\.$/, "");
  return event.title;
}

export interface AlertGroup {
  /** The newest event: actions (message, email) apply to it. */
  latest: DeviceEvent;
  events: DeviceEvent[];
  count: number;
  firstAt: string;
  lastAt: string;
  subject: string | null;
}

/**
 * Fold repeats of the same alert (same type, PC and subject) that happen within
 * two hours of each other, even when other alerts arrive in between. Input must
 * be newest first; each group keeps the position of its newest alert.
 */
export function groupAlerts(events: DeviceEvent[]): AlertGroup[] {
  const groups: AlertGroup[] = [];
  const open = new Map<string, AlertGroup>();
  for (const event of events) {
    const subject = subjectOf(event);
    const key = `${event.type}|${event.device_id}|${subject ?? ""}`;
    const group = open.get(key);
    if (group && Date.parse(group.firstAt) - Date.parse(event.occurred_at) <= FOLD_WITHIN_MS) {
      group.events.push(event);
      group.count += 1;
      group.firstAt = event.occurred_at;
      continue;
    }
    const fresh: AlertGroup = {
      latest: event,
      events: [event],
      count: 1,
      firstAt: event.occurred_at,
      lastAt: event.occurred_at,
      subject,
    };
    open.set(key, fresh);
    groups.push(fresh);
  }
  return groups;
}
