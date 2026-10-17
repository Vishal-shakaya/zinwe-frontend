/**
 * Shared vocabulary for device events: which feature each belongs to, a plain
 * label, what it means for the owner's data, the contextual action the owner can
 * take, and a prefilled note they can send the member. Unknown event types
 * degrade to a plain "Review".
 *
 * Rule confirmations ("Website rules applied", "USB rule applied") are not
 * alerts: they're never shown in an alert list or counted (J5-01).
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
  | "block-tool" // open App monitoring with the remote tool added to the block list
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
  /** One or two plain sentences: what this means for the owner's data, and what to do. */
  meaning: string;
}

const META: Record<string, EventMeta> = {
  "web.blocked_attempt": {
    feature: "internet",
    reviewTo: "/app/internet",
    action: "block-domain",
    label: "Blocked website attempt",
    suggested: "Please avoid blocked sites on your work PC.",
    meaning:
      "Someone tried to open a site your rules block. Zinwe stopped it, so nothing was opened. Repeated tries are worth a word.",
  },
  "data.usb_locked_down": {
    feature: "data",
    reviewTo: "/app/team",
    action: "message",
    label: "USB switched to read-only",
    suggested: "Your USB was set to read-only after a large copy — please call me before using a pen drive again.",
    meaning:
      "A copy to a pen drive went over your USB limit, so Zinwe made this PC's USB read-only straight away. What was already copied can't be undone. Check with them, then press Restore USB to give it back.",
  },
  "data.usb_copy": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large copy to USB",
    suggested: "Large copy to USB noticed — check it's work-approved.",
    meaning:
      "A lot of data went onto a pen drive in one go. Pen drives are the easiest way for client files to leave the office, so check it was for work.",
  },
  "data.share_copy": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large copy to network share",
    suggested: "Large copy to a shared folder noticed — please confirm it's work-related.",
    meaning: "A large amount of data was copied to another PC or shared folder. Check the destination is one you use for work.",
  },
  "data.email_attachment": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large email attachment",
    suggested: "A large email attachment went out — check it's work-approved.",
    meaning:
      "A big attachment was sent from Outlook. Large attachments to personal addresses are a common way data leaks, so check who it went to.",
  },
  "net.upload_over_limit": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "Large upload to a website",
    suggested: "A large upload to a website was noticed — please check it's work-related.",
    meaning: "More data than your limit was uploaded to one website or webmail. Check it's a site your business uses.",
  },
  "usb.connected": {
    feature: "data",
    reviewTo: "/app/data",
    action: "review",
    label: "USB drive connected",
    suggested: "A USB drive was used on your work PC — please keep only work files on it.",
    meaning: "A pen drive or external disk was plugged in. Zinwe notes it so you know which drives are used on your PCs.",
  },
  "usb.blocked": {
    feature: "data",
    reviewTo: "/app/data",
    action: "message",
    label: "USB drive blocked",
    suggested: "USB storage is blocked on your work PC. Contact us if you need an exception.",
    meaning: "Someone tried to use a USB drive and your rule blocked it. Nothing was copied.",
  },
  "usb.policy_applied": {
    feature: "data",
    reviewTo: "/app/data",
    action: "review",
    label: "USB rule applied",
    suggested: "",
    meaning: "The PC switched to your USB rule.",
  },
  "usb.restored": {
    feature: "data",
    reviewTo: "/app/team",
    action: "review",
    label: "USB restored",
    suggested: "",
    meaning: "USB on this PC is back to your normal rule.",
  },
  "remote.tool_detected": {
    feature: "remote",
    reviewTo: "/app/remote",
    action: "block-tool",
    label: "Remote-control tool detected",
    suggested: "Remote-control software was detected — please only use approved tools.",
    meaning:
      "A tool like AnyDesk lets someone outside the office see and control this PC. Scammers often ask staff to install one. If you don't use it, block it.",
  },
  "remote.blocked": {
    feature: "remote",
    reviewTo: "/app/remote",
    action: "review",
    label: "Remote-control tool closed",
    suggested: "A remote-control tool was closed on your PC because it isn't allowed — please talk to me if you need it.",
    meaning: "A tool on your block list started and Zinwe closed it straight away.",
  },
  "software.installed": {
    feature: "remote",
    reviewTo: "/app/remote",
    action: "review",
    label: "Software installed",
    suggested: "New software was installed — please install only approved apps.",
    meaning: "New software was installed on this PC. Unknown programs can carry malware or remote-control tools.",
  },
  "web.blocklist_applied": {
    feature: "internet",
    reviewTo: "/app/internet",
    action: "review",
    label: "Website rules applied",
    suggested: "",
    meaning: "The PC switched to your website rules.",
  },
  "policy.updated": {
    feature: "other",
    reviewTo: "/app/setup",
    action: "review",
    label: "Settings changed",
    suggested: "",
    meaning: "Your rules changed. Every PC picks them up within about a minute.",
  },
};

const FALLBACK: EventMeta = {
  feature: "other",
  reviewTo: "/app/alerts",
  action: "review",
  label: "Activity",
  suggested: "",
  meaning: "",
};

/** Metadata for an event type; a friendly fallback for anything new. */
export function eventMeta(type: string): EventMeta {
  return META[type] ?? { ...FALLBACK, label: prettyType(type) };
}

/**
 * The label for one alert. Same as the type's label, except an email attachment under the limit
 * (sent "For info") isn't called "large".
 */
export function alertLabel(event: DeviceEvent): string {
  if (event.type === "data.email_attachment" && severityOf(event) === "info") return "Email attachment";
  return eventMeta(event.type).label;
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

/** The remote tool an alert is about (its display name, e.g. "AnyDesk"), if it says. */
export function eventTool(event: DeviceEvent): string | null {
  const value = (event.data ?? {}).tool;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type Severity = "info" | "warning" | "critical";

export function severityOf(event: DeviceEvent): Severity {
  return event.severity === "warning" || event.severity === "critical" ? event.severity : "info";
}

/** The one vocabulary for how serious an alert is: Overview, Alerts, filters and chips all use it (J5-11). */
export const SEVERITY_LABEL: Record<Severity, string> = {
  info: "For info",
  warning: "Worth a look",
  critical: "Needs attention",
};

/** Most serious first. */
export const SEVERITY_ORDER: readonly Severity[] = ["critical", "warning", "info"];

/** Rule confirmations the agent sends (a rule took effect): not risks. */
const CONFIRMATION_TYPES = new Set(["web.blocklist_applied", "usb.policy_applied", "usb.restored"]);

/** A rule confirmation, not an alert: never listed or counted as one. */
export function isConfirmation(event: DeviceEvent): boolean {
  return event.kind === "confirmation" || CONFIRMATION_TYPES.has(event.type) || event.type.endsWith(".policy_applied");
}

/** Only real alerts (rule confirmations dropped). Order is kept. */
export function alertsOnly(events: DeviceEvent[] | undefined): DeviceEvent[] {
  return (events ?? []).filter((event) => !isConfirmation(event));
}

/** The owner marked it handled, or messaged the person about it. */
export function isHandled(event: DeviceEvent): boolean {
  return Boolean(event.handled_at);
}

/** "Worth a look" or "Needs attention", and nobody has dealt with it yet. */
export function needsAttention(event: DeviceEvent): boolean {
  return !isConfirmation(event) && !isHandled(event) && severityOf(event) !== "info";
}

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

/** The event types that belong on each feature page's alert table (alerts only, no confirmations). */
export const FEATURE_EVENT_TYPES: Record<Exclude<FeatureKey, "other">, readonly string[]> = {
  internet: ["web.blocked_attempt"],
  data: [
    "data.usb_locked_down",
    "data.usb_copy",
    "data.share_copy",
    "data.email_attachment",
    "net.upload_over_limit",
    "usb.connected",
    "usb.blocked",
  ],
  remote: ["remote.tool_detected", "remote.blocked", "software.installed"],
};
