/**
 * The data every feature page needs: usage metrics for the chart (scoped to the
 * chosen day range), recent events for the alert table, and devices so an alert
 * can be tied back to the member who owns the PC.
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

export function useFeatureData(days: number): FeatureData {
  const loadMetrics = useCallback((signal: AbortSignal) => getMetrics({ days }, signal), [days]);
  const metrics = useResource(loadMetrics, { resetKey: days });

  const loadEvents = useCallback((signal: AbortSignal) => listEvents({ limit: EVENTS_LIMIT }, signal), []);
  const events = useResource(loadEvents, { pollMs: 60_000 });

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal), []);
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
