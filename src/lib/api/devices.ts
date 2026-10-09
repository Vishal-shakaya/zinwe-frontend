/** PCs, enrollment key, rules and activity (z_devices). */
import { authedRequest } from "./http";

export interface Device {
  id: number;
  hostname: string;
  /** "windows" | "linux" | "macos" today; kept open for new agents. */
  platform: string;
  os_version: string;
  agent_version: string;
  enrolled_at: string;
  last_seen_at: string | null;
  is_online: boolean;
  is_revoked: boolean;
}

export interface EnrollmentKey {
  key: string;
  created_at: string;
  last_used_at: string | null;
}

export type UsbMode = "allow" | "read_only" | "block";

export interface Policy {
  version: number;
  usb: { mode: UsbMode };
  updated_at: string;
}

export type EventSeverity = "info" | "warning" | "critical";

export interface DeviceEvent {
  id: number;
  device_id: number;
  hostname: string;
  type: string;
  /** "info" | "warning" | "critical"; unknown values render as info. */
  severity: string;
  title: string;
  occurred_at: string;
  received_at: string;
  data: Record<string, unknown>;
}

/** GET /api/devices/ — the owner's PCs with online status. */
export function listDevices(signal?: AbortSignal): Promise<Device[]> {
  return authedRequest<Device[]>("/api/devices/", { signal });
}

/** GET /api/devices/enrollment-key/ — the key new PCs join with (created on first call). */
export function getEnrollmentKey(signal?: AbortSignal): Promise<EnrollmentKey> {
  return authedRequest<EnrollmentKey>("/api/devices/enrollment-key/", { signal });
}

/** POST /api/devices/enrollment-key/rotate/ — retire the key and issue a new one. */
export function rotateEnrollmentKey(): Promise<EnrollmentKey> {
  return authedRequest<EnrollmentKey>("/api/devices/enrollment-key/rotate/", { method: "POST", body: {} });
}

/** GET /api/devices/policy/ — the rules every PC follows. */
export function getPolicy(signal?: AbortSignal): Promise<Policy> {
  return authedRequest<Policy>("/api/devices/policy/", { signal });
}

/** PUT /api/devices/policy/ — change the rules; the version goes up only when something changed. */
export function updatePolicy(usbMode: UsbMode): Promise<Policy> {
  return authedRequest<Policy>("/api/devices/policy/", { method: "PUT", body: { usb: { mode: usbMode } } });
}

export const EVENTS_DEFAULT_LIMIT = 50;
export const EVENTS_MAX_LIMIT = 200;

/** GET /api/devices/events/ — newest first, the owner's PCs only. */
export function listEvents(
  params: { device?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<DeviceEvent[]> {
  return authedRequest<DeviceEvent[]>("/api/devices/events/", {
    query: { device: params.device, limit: params.limit },
    signal,
  });
}
