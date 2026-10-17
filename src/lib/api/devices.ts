/** PCs, members, rules and activity (z_devices). */
import { authedRequest } from "./http";

/**
 * What the agent last reported the person was doing (M8). Older agents that
 * don't send it heartbeat as "not_started"; treat any unknown value as that.
 */
export type WorkState = "not_started" | "working" | "on_break" | "ended";
export const WORK_STATES: readonly WorkState[] = ["not_started", "working", "on_break", "ended"];

/** Narrow an unknown wire value to a WorkState, defaulting to "not_started". */
export function toWorkState(value: unknown): WorkState {
  return WORK_STATES.includes(value as WorkState) ? (value as WorkState) : "not_started";
}

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
  /** The member this PC enrolled as, when the backend has joined it in. */
  member_id?: number | null;
  member_name?: string | null;
  /** Work status (M8). Optional so an older backend/agent degrades cleanly. */
  work_state?: WorkState;
  worked_seconds?: number;
  break_seconds?: number;
  /** When the agent switched this PC's USB to read-only after a large copy (null = not locked). */
  usb_locked_at?: string | null;
  /** The owner pressed "Restore USB"; the PC restores it on its next check-in. */
  usb_restore_requested_at?: string | null;
  /** The person's answer on the widget's consent screen. Absent on older backends. */
  consent_state?: ConsentState;
  consent_declined_at?: string | null;
}

/** "pending" until the person answers on their PC; "declined" = nothing is collected from that PC. */
export type ConsentState = "pending" | "given" | "declined";

/**
 * A person the owner has added. They enrol their PC with their email + the
 * `member_id` below (format "ZM-XXXX-XXXX"), which replaces the old org-wide key.
 */
export interface Member {
  id: number;
  name: string;
  email: string;
  /** The enrol id shown to the owner, e.g. "ZM-7KQ2-9F3M". */
  member_id: string;
  is_active: boolean;
  created_at: string;
  /** The PC this member has enrolled, or null until they install the agent. */
  device: MemberDevice | null;
  /** Where this member downloads the agent — same link as their invite email. */
  download_url?: string;
  /** Unread replies from this member the admin hasn't opened yet (chat badge). */
  unread?: number;
}

/** The slice of a Device the Team page shows beside a member. */
export interface MemberDevice {
  hostname: string;
  last_seen_at: string | null;
  is_online: boolean;
  agent_version?: string;
  /** Work status (M8). Optional so an older backend/agent degrades cleanly. */
  work_state?: WorkState;
  worked_seconds?: number;
  break_seconds?: number;
  /** The member's consent on the widget's consent screen: which policy version, and when ("" / null = not yet). */
  consent_version?: string;
  consent_at?: string | null;
  /** Same as on Device, when the backend joins them into the member's PC. */
  consent_state?: ConsentState;
  usb_locked_at?: string | null;
}

export interface MemberPayload {
  name: string;
  email: string;
}

export type MemberField = keyof MemberPayload;

export type UsbMode = "allow" | "read_only" | "block";

export type WebMode = "monitor" | "block";

/** The built-in category lists the agent recognises. */
export type WebCategory = "adult" | "gambling" | "malware" | "phishing";
export const WEB_CATEGORIES: readonly WebCategory[] = ["adult", "gambling", "malware", "phishing"];

export interface UsbPolicy {
  mode: UsbMode;
}

export interface WebPolicy {
  enabled: boolean;
  /** monitor = record usage only; block = also block the chosen categories and domains. */
  mode: WebMode;
  /** Subset of WEB_CATEGORIES; [] means "all built-in" when blocking. */
  categories: WebCategory[];
  /** Extra domains to block, e.g. "example.com". */
  custom_domains: string[];
}

export interface DataTransferPolicy {
  enabled: boolean;
  usb_warn_bytes: number;
  lan_warn_bytes: number;
  email_warn_bytes: number;
  /** OFF by default: filenames/subjects are recorded only when true. */
  include_details: boolean;
  /** When true, a USB copy over the usb limit auto-sets the PC to USB read-only. */
  usb_lockdown: boolean;
}

export interface RemoteSoftwarePolicy {
  enabled: boolean;
  blocking_enabled: boolean;
  /** Tool display names to block when seen, e.g. "AnyDesk". */
  blocked_tools: string[];
  /** Extra executable names (no .exe) to also treat as remote tools. */
  extra_tool_executables: string[];
}

export interface Policy {
  version: number;
  usb: UsbPolicy;
  web: WebPolicy;
  data_transfer: DataTransferPolicy;
  remote_software: RemoteSoftwarePolicy;
  updated_at: string;
}

/** A partial change: send only the block(s) the owner actually edited. */
export interface PolicyUpdate {
  usb?: UsbPolicy;
  web?: WebPolicy;
  data_transfer?: DataTransferPolicy;
  remote_software?: RemoteSoftwarePolicy;
}

/** Defaults matching the backend's new-Policy and migration defaults. */
export const POLICY_DEFAULTS = {
  usb: { mode: "allow" } as UsbPolicy,
  web: { enabled: true, mode: "monitor", categories: [], custom_domains: [] } as WebPolicy,
  data_transfer: {
    enabled: true,
    usb_warn_bytes: 52_428_800,
    lan_warn_bytes: 52_428_800,
    email_warn_bytes: 20_971_520,
    include_details: false,
    usb_lockdown: false,
  } as DataTransferPolicy,
  remote_software: {
    enabled: true,
    blocking_enabled: false,
    blocked_tools: [],
    extra_tool_executables: [],
  } as RemoteSoftwarePolicy,
} as const;

/**
 * Fill in any block the backend hasn't shipped yet, so the page always has a
 * full shape to edit even while the backend is mid-rollout.
 */
export function normalizePolicy(raw: Policy): Policy {
  return {
    version: raw.version,
    updated_at: raw.updated_at,
    usb: raw.usb ?? { ...POLICY_DEFAULTS.usb },
    web: raw.web ?? { ...POLICY_DEFAULTS.web, categories: [], custom_domains: [] },
    data_transfer: raw.data_transfer ?? { ...POLICY_DEFAULTS.data_transfer },
    remote_software: raw.remote_software
      ? raw.remote_software
      : { ...POLICY_DEFAULTS.remote_software, blocked_tools: [], extra_tool_executables: [] },
  };
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
  /** When this alert was emailed to the member (via Activity → Send mail), or null. */
  emailed_at?: string | null;
  /** "confirmation" = a rule was applied (not a risk): never shown or counted as an alert. */
  kind?: "alert" | "confirmation";
  /** When the owner marked it handled (or messaged the person about it); null = still open. */
  handled_at?: string | null;
  /** Who handled it ("" when not handled). */
  handled_by?: string;
}

/** POST /api/devices/events/<id>/handled/ — mark an alert handled (or open again). */
export function markEventHandled(eventId: number, handled: boolean): Promise<DeviceEvent> {
  return authedRequest<DeviceEvent>(`/api/devices/events/${eventId}/handled/`, { method: "POST", body: { handled } });
}

/** POST /api/devices/<id>/usb/restore/ — give a PC its USB back after an automatic read-only lock. */
export function restoreUsb(deviceId: number): Promise<Device> {
  return authedRequest<Device>(`/api/devices/${deviceId}/usb/restore/`, { method: "POST", body: {} });
}

/** One change in a member's work day (from the widget's Start / Break / Resume / End). */
export interface WorkLogEntry {
  id: number;
  device_id: number;
  hostname: string;
  member_id: number | null;
  member_name: string | null;
  /** "working" = started or back from a break; "on_break"; "ended" = ended the day. */
  state: "working" | "on_break" | "ended";
  previous_state: string;
  at: string;
  /** The break reason the member picked (only on "on_break"). */
  reason: string;
  /** Optional message the member added to the break. */
  note?: string;
  /** Breaks only: "pending" until the owner approves or denies; "" for other changes. */
  approval?: "" | "pending" | "approved" | "denied";
  decided_at?: string | null;
  decision_note?: string;
}

export interface WorkLog {
  /** yyyy-mm-dd (server-local day). */
  date: string;
  entries: WorkLogEntry[];
}

/** POST /api/devices/work-log/<id>/decision/ — approve or deny a break; the member is told in their widget. */
export function decideBreak(id: number, decision: "approved" | "denied", note = ""): Promise<WorkLogEntry> {
  return authedRequest<WorkLogEntry>(`/api/devices/work-log/${id}/decision/`, {
    method: "POST",
    body: { decision, note },
  });
}

/** GET /api/devices/work-log/?date=&member= — one day's start/break/end changes, oldest first. */
export function getWorkLog(params: { date?: string; member?: number } = {}, signal?: AbortSignal): Promise<WorkLog> {
  return authedRequest<WorkLog>("/api/devices/work-log/", { query: { date: params.date, member: params.member }, signal });
}

export interface AlertEmailResult {
  sent_to: string;
  sent_at: string;
}

/**
 * POST /api/devices/events/<id>/email/ — email the member whose PC raised this alert,
 * with the dashboard's wording. Once per alert (409 if already sent; 400 if the PC has no member).
 */
export function emailAlert(eventId: number, wording: { label: string; suggested: string }): Promise<AlertEmailResult> {
  return authedRequest<AlertEmailResult>(`/api/devices/events/${eventId}/email/`, { method: "POST", body: wording });
}

/** GET /api/devices/ — the owner's PCs with online status. */
export function listDevices(signal?: AbortSignal): Promise<Device[]> {
  return authedRequest<Device[]>("/api/devices/", { signal });
}

/** GET /api/devices/members/ — the people the owner has added, newest first. */
export function listMembers(signal?: AbortSignal): Promise<Member[]> {
  return authedRequest<Member[]>("/api/devices/members/", { signal });
}

/** POST /api/devices/members/ — add a member; the response carries their id code. */
export function createMember(payload: MemberPayload): Promise<Member> {
  return authedRequest<Member>("/api/devices/members/", { method: "POST", body: payload });
}

/**
 * POST /api/devices/members/<id>/rotate-id/ — issue a fresh id code for this member. With `email`
 * (default true) the invite email is sent again with the new ID.
 */
export function rotateMemberId(id: number, options: { email?: boolean } = {}): Promise<Member> {
  return authedRequest<Member>(`/api/devices/members/${id}/rotate-id/`, {
    method: "POST",
    body: { email: options.email ?? true },
  });
}

/** POST /api/devices/members/<id>/deactivate/ — stop this member enrolling or checking in. */
export function deactivateMember(id: number): Promise<Member> {
  return authedRequest<Member>(`/api/devices/members/${id}/deactivate/`, { method: "POST", body: {} });
}

/**
 * A short note the owner sends to a member. It is delivered to that member's
 * Zinwe widget on their PC (the agent picks it up on its next check-in).
 */
export interface Message {
  id: number;
  /** "owner" = an admin message/alert; "member" = the member's reply. */
  sender: "owner" | "member";
  /** Admin lines: how it went out. "email" lines never reach the PC (no receipts). */
  channel?: MessageChannel;
  title: string;
  body: string | null;
  /** "info" | "warning" | "critical"; unknown values render as info. */
  severity: EventSeverity;
  created_at: string;
  /** Seen state per side (for "delivered"/unread). */
  read_by_owner: boolean;
  read_by_member: boolean;
  /** Admin lines: when the member's PC first pulled it (null = not on their PC yet). */
  delivered_at?: string | null;
  /** Admin lines: when the member opened it in the widget's chat (null on older rows). */
  read_by_member_at?: string | null;
}

/**
 * GET /api/devices/members/<memberPk>/messages/ — the full two-way conversation
 * with one member, newest first. Fetching it marks the member's replies as read,
 * so the member's `unread` count clears.
 */
export function getMemberThread(memberPk: number, signal?: AbortSignal): Promise<Message[]> {
  return authedRequest<Message[]>(`/api/devices/members/${memberPk}/messages/`, { signal });
}

export const MESSAGE_TITLE_MAX = 120;
export const MESSAGE_BODY_MAX = 2000;

/** Where a note goes: the Zinwe widget on their PC, the widget plus their inbox, or their inbox only. */
export type MessageChannel = "chat" | "chat_email" | "email";

/** What the owner types when sending a message. */
export interface MessagePayload {
  title: string;
  body?: string;
  severity?: EventSeverity;
  /** Defaults to "chat" (widget only). */
  channel?: MessageChannel;
  /** The alert this note is about: sending it marks that alert handled. */
  event_id?: number;
}

export type MessageField = "title" | "body" | "severity";

/**
 * POST /api/devices/members/<memberPk>/message/ — send a short message to this
 * member; it appears in their Zinwe widget. `memberPk` is the Member row's id
 * (not their "ZM-…" connect code).
 */
export function sendMessage(memberPk: number, payload: MessagePayload): Promise<Message> {
  return authedRequest<Message>(`/api/devices/members/${memberPk}/message/`, { method: "POST", body: payload });
}

/** GET /api/devices/policy/ — the rules every PC follows (all feature blocks). */
export async function getPolicy(signal?: AbortSignal): Promise<Policy> {
  return normalizePolicy(await authedRequest<Policy>("/api/devices/policy/", { signal }));
}

/**
 * PUT /api/devices/policy/ — change the rules. The body carries only the
 * block(s) that changed (partial, multi-block); the version goes up by one only
 * when something actually changed.
 */
export async function updatePolicy(patch: PolicyUpdate): Promise<Policy> {
  return normalizePolicy(await authedRequest<Policy>("/api/devices/policy/", { method: "PUT", body: patch }));
}

export const EVENTS_DEFAULT_LIMIT = 50;
export const EVENTS_MAX_LIMIT = 200;

/**
 * GET /api/devices/events/ — newest first, the owner's PCs only. Optionally one PC, one team member's
 * PCs, and/or only some event types (a feature page asks for its own, so other alerts can't crowd it out).
 */
export function listEvents(
  params: { device?: number; member?: number; types?: readonly string[]; limit?: number } = {},
  signal?: AbortSignal,
): Promise<DeviceEvent[]> {
  return authedRequest<DeviceEvent[]>("/api/devices/events/", {
    query: {
      device: params.device,
      member: params.member,
      types: params.types?.length ? params.types.join(",") : undefined,
      limit: params.limit,
    },
    signal,
  });
}

// ---------------------------------------------------------------------------
// Usage metrics (for the feature-page charts)
// ---------------------------------------------------------------------------

/**
 * Metric categories the agent reports. The feature pages chart these; the list
 * is open-ended, so an unknown category is tolerated (it simply has no label).
 */
export type MetricCategory =
  | "web.domain"
  | "app.foreground"
  | "transfer.usb"
  | "transfer.lan"
  | "transfer.email"
  | "remote.detected"
  | (string & {});

/** One category's totals over the requested window. */
export interface MetricCategoryTotal {
  category: string;
  total_count: number;
  total_bytes: number;
  total_seconds: number;
}

/**
 * One (hour bucket, category) point. The backend collapses per-key detail and
 * sums across the owner's PCs, so this is a combined series ready to plot.
 */
export interface MetricPoint {
  bucket_start: string;
  category: string;
  count: number;
  bytes: number;
  seconds: number;
}

/** GET /api/devices/metrics/ response: per-category totals + an oldest-first series. */
export interface Metrics {
  categories: MetricCategoryTotal[];
  series: MetricPoint[];
}

export interface MetricsQuery {
  /** Scope to one member's PC(s). */
  member?: number;
  /** Scope to one PC. */
  device?: number;
  /** 1..31; the backend defaults to 7 when omitted. */
  days?: number;
  /** Scope to a single metric category. */
  category?: MetricCategory;
}

/**
 * GET /api/devices/metrics/ — usage for the charts, the owner's own PCs only.
 * The backend returns empty arrays (never an error) when there's no data yet.
 */
export function getMetrics(params: MetricsQuery = {}, signal?: AbortSignal): Promise<Metrics> {
  return authedRequest<Metrics>("/api/devices/metrics/", {
    query: { member: params.member, device: params.device, days: params.days, category: params.category },
    signal,
  });
}

/** One item in a per-key breakdown: a domain or app, with its summed usage. */
export interface MetricTopItem {
  /** The domain (for web.domain) or app process name (for app.foreground). */
  key: string;
  count: number;
  bytes: number;
  seconds: number;
}

/** GET /api/devices/metrics/top/ response: the ranked per-key breakdown for one category. */
export interface MetricsTop {
  category: string;
  items: MetricTopItem[];
}

export interface MetricsTopQuery extends MetricsQuery {
  /** The category to break down, e.g. "web.domain" or "app.foreground" (required). */
  category: MetricCategory;
  /** Max rows to return (1..100; backend default 20). */
  limit?: number;
}

/**
 * GET /api/devices/metrics/top/ — the per-domain / per-app breakdown within one
 * category (the detail the chart totals collapse away). Owner-scoped: a company
 * only ever sees its own PCs. Returns an empty list when there's nothing yet.
 */
export function getTopMetrics(params: MetricsTopQuery, signal?: AbortSignal): Promise<MetricsTop> {
  return authedRequest<MetricsTop>("/api/devices/metrics/top/", {
    query: {
      category: params.category,
      member: params.member,
      device: params.device,
      days: params.days,
      limit: params.limit,
    },
    signal,
  });
}
