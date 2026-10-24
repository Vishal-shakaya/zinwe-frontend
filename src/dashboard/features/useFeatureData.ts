/**
 * The data every feature page needs: usage metrics for the tiles and chart (scoped to the chosen day
 * range and, optionally, one team member), the feature's recent alerts (same scope), and devices so an
 * alert can be tied back to the member who owns the PC.
 */
import { useCallback, useMemo } from "react";
import { getMetrics, listDevices, listEvents, type Device, type DeviceEvent, type Metrics } from "../../lib/api";
import type { AlertMember } from "../components/AlertsTable";
import { useNow } from "../time";
import { useResource, type Resource } from "../useResource";
import { makeMemberResolver } from "./events";

export interface FeatureData {
  metrics: Resource<Metrics>;
  events: Resource<DeviceEvent[]>;
  devices: Resource<Device[]>;
  now: number;
  resolveMember: (deviceId: number) => AlertMember | null;
}

const EVENTS_LIMIT = 200;

/**
 * `member` = a team member's id, or null for everyone. `types` = the feature's event types (keep it a
 * module-level constant: it's part of the request).
 */
export function useFeatureData(days: number, member: number | null, types: readonly string[]): FeatureData {
  const scope = `${days}:${member ?? "all"}`;
  const loadMetrics = useCallback(
    (signal: AbortSignal) => getMetrics({ days, member: member ?? undefined }, signal),
    [days, member],
  );
  const metrics = useResource(loadMetrics, { resetKey: scope });

  const loadEvents = useCallback(
    (signal: AbortSignal) => listEvents({ limit: EVENTS_LIMIT, member: member ?? undefined, types }, signal),
    [member, types],
  );
  const events = useResource(loadEvents, { pollMs: 60_000, resetKey: member ?? "all" });

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal, { includeRemoved: true }), []);
  const devices = useResource(loadDevices, { pollMs: 60_000 });

  const now = useNow();
  const resolveMember = useMemo(() => makeMemberResolver(devices.data), [devices.data]);

  return { metrics, events, devices, now, resolveMember };
}

/** Keep only the events whose type is in `types`, newest first (already sorted). */
export function filterEvents(events: DeviceEvent[] | undefined, types: readonly string[]): DeviceEvent[] {
  if (!events) return [];
  const set = new Set(types);
  return events.filter((event) => set.has(event.type));
}
