/**
 * Shared vocabulary for device events: which feature each belongs to, a plain
 * label, the contextual action the owner can take, and a prefilled note they
 * can send the member. Unknown event types degrade to a plain "Review".
 */
import type { Device, DeviceEvent } from "../../lib/api";

/** The member who owns the PC an event came from (for the "Message" action). */
export interface AlertMember {
  id: number;
  name: string;
}

export type FeatureKey = "internet" | "data" | "remote" | "other";

export type ActionKind =
  | "block-domain" // open Internet controls, prefilled with the domain
  | "message" // open a prefilled message to the member who owns the PC
  | "review"; // open the relevant feature page

export interface EventMeta {
  feature: FeatureKey;
  /** The feature page an owner reviews this on. */
  reviewTo: string;
  /** The primary contextual action for this event type. */
  action: ActionKind;
  /** Short label for the "Type" column. */
  label: string;
  /** A prefilled owner → member note. Empty string = no useful preset. */
  suggested: string;
}

const META: Record<string, EventMeta> = {
  "web.blocked_attempt": {
    feature: "internet",
    reviewTo: "/app/internet",
    action: "block-domain",
    label: "Blocked website attempt",
    suggested: "Please avoid blocked sites on your work PC.",
  },
  "data.usb_copy": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large copy to USB",
    suggested: "Large copy to USB noticed — check it's work-approved.",
  },
  "data.share_copy": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large copy to network share",
    suggested: "Large copy to a shared folder noticed — please confirm it's work-related.",
  },
  "data.email_attachment": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large email attachment",
    suggested: "A large email attachment went out — check it's work-approved.",
  },
  "usb.connected": {
    feature: "data",
    reviewTo: "/app/data",
    action: "review",
    label: "USB drive connected",
    suggested: "A USB drive was used on your work PC — please keep only work files on it.",
  },
  "usb.blocked": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "USB drive blocked",
    suggested: "USB storage is blocked on your work PC. Contact us if you need an exception.",
  },
  "usb.policy_applied": {
    feature: "data",
    reviewTo: "/app/data",
    action: "review",
    label: "USB rule applied",
    suggested: "",
  },
  "remote.tool_detected": {
    feature: "remote",
    reviewTo: "/app/remote",
    action: "message",
    label: "Remote-control tool detected",
    suggested: "Remote-control software was detected — please only use approved tools.",
  },
  "software.installed": {
    feature: "remote",
    reviewTo: "/app/remote",
    action: "review",
    label: "Software installed",
    suggested: "New software was installed — please install only approved apps.",
  },
  "policy.updated": {
    feature: "other",
    reviewTo: "/app/setup",
    action: "review",
    label: "Settings changed",
    suggested: "",
  },
};

const FALLBACK: EventMeta = {
  feature: "other",
  reviewTo: "/app/alerts",
  action: "review",
  label: "Activity",
  suggested: "",
};

/** Metadata for an event type; a friendly fallback for anything new. */
export function eventMeta(type: string): EventMeta {
  return META[type] ?? { ...FALLBACK, label: prettyType(type) };
}

/** "remote.tool_detected" → "Remote tool detected" for unknown types. */
function prettyType(type: string): string {
  const words = type.replace(/[._]/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Activity";
}

/** The best domain to prefill a block action with, if the event carries one. */
export function eventDomain(event: DeviceEvent): string | null {
  const data = event.data ?? {};
  for (const key of ["domain", "host", "url", "site"]) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export type Severity = "info" | "warning" | "critical";

export function severityOf(event: DeviceEvent): Severity {
  return event.severity === "warning" || event.severity === "critical" ? event.severity : "info";
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  info: "For info",
  warning: "Worth a look",
  critical: "Needs attention",
};

/**
 * Builds a device_id → member resolver from the devices list, for the alert
 * table's "Message" action. Returns null when the PC has no linked member yet.
 */
export function makeMemberResolver(devices: Device[] | undefined): (deviceId: number) => AlertMember | null {
  const byId = new Map<number, AlertMember>();
  for (const device of devices ?? []) {
    if (device.member_id != null && device.member_name) {
      byId.set(device.id, { id: device.member_id, name: device.member_name });
    }
  }
  return (deviceId: number) => byId.get(deviceId) ?? null;
}

/** The event types that belong on each feature page's alert table. */
export const FEATURE_EVENT_TYPES: Record<Exclude<FeatureKey, "other">, readonly string[]> = {
  internet: ["web.blocked_attempt"],
  data: [
    "data.usb_copy",
    "data.share_copy",
    "data.email_attachment",
    "usb.connected",
    "usb.blocked",
    "usb.policy_applied",
  ],
  remote: ["remote.tool_detected", "software.installed"],
};
