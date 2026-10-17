/**
 * One plain-English status for a person/PC, combining whether the agent is
 * reachable (is_online) with what it last said the person was doing (work_state).
 *
 * Rules, in order:
 * - no PC connected yet            → "waiting"
 * - agent offline                  → "offline"   (rules still apply locally)
 * - online + on_break              → "break"
 * - online + working               → "working"
 * - online + ended/not_started     → "online"    (reachable, not clocked in)
 */
import { toWorkState, type WorkState } from "../../lib/api";

export type PresenceStatus = "working" | "break" | "online" | "offline" | "waiting";

export interface WorkLike {
  is_online: boolean;
  last_seen_at: string | null;
  work_state?: WorkState;
  worked_seconds?: number;
  break_seconds?: number;
}

export function presenceOf(device: WorkLike | null | undefined): PresenceStatus {
  if (!device) return "waiting";
  if (!device.is_online) return device.last_seen_at ? "offline" : "waiting";
  const state = toWorkState(device.work_state);
  if (state === "on_break") return "break";
  if (state === "working") return "working";
  return "online";
}

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  working: "Working",
  break: "On break",
  online: "Online",
  offline: "Offline",
  waiting: "Not connected",
};

/** Maps to the dash-status--* colour classes already in dashboard.css, plus two new ones. */
export const PRESENCE_CLASS: Record<PresenceStatus, string> = {
  working: "online",
  break: "break",
  online: "idle",
  offline: "offline",
  waiting: "waiting",
};

/** "2h 15m", "45m", "0m" — a compact worked/break duration from whole seconds. */
export function formatDuration(seconds: number | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Where a person's consent on their own PC stands: no PC yet, waiting for them, agreed, or declined. */
export type ConsentStatus = "none" | "pending" | "given" | "declined";

interface ConsentLike {
  consent_state?: "pending" | "given" | "declined";
  consent_at?: string | null;
}

/**
 * The person's answer on their Zinwe widget's consent screen. `consent_state` from current backends wins
 * (from the member's PC or the full device record); older ones only say when consent was given.
 */
export function consentOf(pc: ConsentLike | null | undefined, device?: ConsentLike | null): ConsentStatus {
  if (!pc && !device) return "none";
  const state = pc?.consent_state ?? device?.consent_state;
  if (state === "given" || state === "declined" || state === "pending") return state;
  return pc?.consent_at || device?.consent_at ? "given" : "pending";
}

/** A ready-to-send note asking someone to answer the consent screen on their PC (they can still edit it). */
export function consentReminder(name: string, status: ConsentStatus): string {
  const first = name.trim().split(/\s+/)[0] || name;
  if (status === "declined") {
    return `Hi ${first}, I saw you said no to the Zinwe notice on your PC. Can we talk about it? Zinwe only records work-related activity like USB copies and risky websites — never keystrokes, screenshots or your files.`;
  }
  return `Hi ${first}, please open Zinwe on your PC (the icon near the clock), read the notice and choose "I agree" so your PC is protected. Thanks!`;
}

/** "since 2:19 PM" today, "since 16 Oct, 2:19 PM" before. */
export function sinceLabel(iso: string, now: number): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const sameDay = new Date(now).toDateString() === at.toDateString();
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return sameDay ? `since ${time}` : `since ${at.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}
