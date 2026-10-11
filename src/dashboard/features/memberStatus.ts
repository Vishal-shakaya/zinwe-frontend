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
