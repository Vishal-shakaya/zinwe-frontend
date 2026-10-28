/**
 * One alert row as the v1.3 boards draw it (DashAlerts, DashOverview "Needs you"), built from the real feed:
 * a person-first title, the level (Needs you / Worth a look / Handled automatically), the size against your
 * limit, "What happened" facts, "Why it matters", the rule link, and the kind Ask wording.
 */
import type { Device, DeviceEvent, Member, Policy } from "../../lib/api";
import { detailOf, subjectOf, type AlertGroup } from "../features/alertGroups";
import { alertLabel, eventMeta, isHandled, severityOf } from "../features/events";
import { askDraft, WHY, type AlertAsk, type AlertAsks, type AlertKind, type AlertLevel } from "../fixtures/majorAlerts";
import { dayGroup } from "../time";
import { clockTime } from "../ui/time";

export const LEVEL_TONE: Record<AlertLevel, { pill: string; bar: string; bg: string; fg: string }> = {
  needs: { pill: "red", bar: "#C0331C", bg: "#FCE8E4", fg: "#C0331C" },
  worth: { pill: "amber", bar: "#8A5300", bg: "#FBF0D9", fg: "#8A5300" },
  auto: { pill: "", bar: "#B9B0A2", bg: "#EFECE5", fg: "#4A443C" },
};

/** Icon paths per type, from the board. */
export const KIND_ICON: Record<AlertKind, string> = {
  usb: "M9 2h6v6H9zM7 8h10v10a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z",
  remote: "M3 4h18v12H3zM8 20h8M12 16v4",
  software: "M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10",
  web: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  email: "M4 6h16v12H4zM4 7l8 6 8-6",
  network: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
  upload: "M12 15V3M7 8l5-5 5 5M5 21h14",
  other: "M12 3 2 20h20zM12 10v4M12 17h.01",
};

/** Which part of Rules each type's rule link opens (Rules has #hours, #web, #usb, #limits, #remote, #software). */
const RULE_AT: Record<AlertKind, string> = {
  usb: "usb",
  remote: "remote",
  software: "software",
  web: "web",
  email: "limits",
  network: "limits",
  upload: "limits",
  other: "limits",
};

export function levelOf(event: DeviceEvent): AlertLevel {
  const s = severityOf(event);
  return s === "critical" ? "needs" : s === "warning" ? "worth" : "auto";
}

export function kindOf(event: DeviceEvent): AlertKind {
  const t = event.type;
  if (t === "data.usb_copy" || t === "data.usb_locked_down" || t.startsWith("usb.")) return "usb";
  if (t.startsWith("remote.")) return "remote";
  if (t === "software.installed") return "software";
  if (t.startsWith("web.")) return "web";
  if (t === "data.email_attachment") return "email";
  if (t === "data.share_copy") return "network";
  if (t === "net.upload_over_limit") return "upload";
  return "other";
}

/** Done = marked as fine, or normal activity Zinwe handled on its own. */
export function isDone(event: DeviceEvent): boolean {
  return isHandled(event) || levelOf(event) === "auto";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** 1.8 GB, 320 MB, 640 KB. */
export function bytesLabel(bytes: number): string {
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  const one = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));
  if (bytes >= gb) return `${one(bytes / gb)} GB`;
  if (bytes >= mb) return `${one(bytes / mb)} MB`;
  return `${Math.max(1, Math.round(bytes / kb))} KB`;
}

/** "1:05 PM" (the boards' clock format). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : clockTime(d);
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** "at 1:05 PM" today, "yesterday at 5:30 PM", "on 15 Oct at 9:46 PM". */
function whenWords(iso: string, now: number): string {
  const { label } = dayGroup(iso, now);
  const t = formatTime(iso);
  if (label === "Today") return `at ${t}`;
  if (label === "Yesterday") return `yesterday at ${t}`;
  return `on ${label} at ${t}`;
}

function sentence(text: string): string {
  const t = text.trim();
  return t ? (/[.!?”"]$/.test(t) ? t : `${t}.`) : "";
}

function limitFor(kind: AlertKind, event: DeviceEvent, policy: Policy | undefined): number | null {
  const own = num(event.data?.limit_bytes);
  if (own) return own;
  const dt = policy?.data_transfer;
  if (!dt) return null;
  if (kind === "usb" && event.type === "data.usb_copy") return dt.usb_warn_bytes;
  if (kind === "network") return dt.lan_warn_bytes;
  if (kind === "email") return dt.email_warn_bytes;
  return null;
}

function ruleLinkFor(kind: AlertKind, event: DeviceEvent, policy: Policy | undefined): string {
  const dt = policy?.data_transfer;
  const lim = (n: number | undefined) => (n ? bytesLabel(n) : "your limit");
  switch (kind) {
    case "usb": {
      const mode = policy?.usb.mode;
      const m = mode === "block" ? "blocked" : mode === "read_only" ? "read-only" : "allowed";
      return `USB rule: ${m}, alert over ${lim(dt?.usb_warn_bytes)}`;
    }
    case "network":
      return `Shared folders: alert over ${lim(dt?.lan_warn_bytes)}`;
    case "email":
      return `Email attachments: alert over ${lim(dt?.email_warn_bytes)}`;
    case "upload":
      return `Uploads: alert over ${lim(num(event.data?.limit_bytes) ?? undefined)}`;
    case "remote":
      return `Remote-control rule: ${policy?.remote_software.blocking_enabled ? "block listed apps" : "alert only"}`;
    case "software":
      return "New-software alerts: on";
    case "web": {
      const web = policy?.web;
      if (!web) return "Website rule";
      return web.mode === "block"
        ? `Website rule: block ${web.categories.length || 4} ${web.categories.length === 1 ? "category" : "categories"}`
        : "Website rule: record only";
    }
    default:
      return "Review the rule";
  }
}

export interface AlertView {
  /** The newest event's id (the row's key). */
  id: number;
  latest: DeviceEvent;
  /** Every event folded into this row (Mark as fine applies to all of them). */
  ids: number[];
  count: number;
  level: AlertLevel;
  kind: AlertKind;
  done: boolean;
  handled: boolean;
  title: string;
  body: string;
  facts: string[];
  why: string;
  ruleHref: string;
  ruleLink: string;
  limit: { text: string; over: boolean } | null;
  person: Member | undefined;
  first: string;
  pc: string;
  time: string;
  dayKey: string;
  dayLabel: string;
  draft: string;
  ask: AlertAsk | undefined;
  /** The PC's USB is read-only right now (Restore USB on the row). */
  lockedPc: Device | undefined;
}

export interface ViewContext {
  now: number;
  personFor: (deviceId: number) => Member | undefined;
  devices: Device[] | undefined;
  policy: Policy | undefined;
  asks: AlertAsks | undefined;
}

export function viewOf(group: AlertGroup, ctx: ViewContext): AlertView {
  const e = group.latest;
  const d = e.data ?? {};
  const level = levelOf(e);
  const kind = kindOf(e);
  const person = ctx.personFor(e.device_id);
  const first = firstName(person?.name);
  const host = e.hostname || "A PC";
  const subj = first || host;
  const pcOf = first ? `${first}’s PC` : host;
  const bytes = num(d.total_bytes);
  const size = bytes ? bytesLabel(bytes) : null;
  const tool = str(d.tool) ?? subjectOf(e) ?? "a remote-control app";
  const domain = str(d.domain) ?? str(d.host) ?? subjectOf(e) ?? "a blocked site";
  const product = str(d.product) ?? subjectOf(e) ?? "new software";
  const files = num(d.file_count) ?? num(d.attachment_count);

  let title: string;
  let what: string;
  switch (e.type) {
    case "remote.tool_detected":
      title = `${pcOf} opened ${tool}`;
      what = tool;
      break;
    case "remote.blocked":
      title = `${pcOf} started ${tool}`;
      what = tool;
      break;
    case "data.usb_copy":
      title = `${subj} copied ${size ?? "files"} to a pen drive`;
      what = `a ${size ? `${size} ` : ""}copy to a pen drive`;
      break;
    case "data.usb_locked_down":
      title = first ? `${first}’s USB was switched to read-only` : `USB on ${host} was switched to read-only`;
      what = "a large copy to a pen drive";
      break;
    case "usb.connected":
      title = `${subj} plugged in a USB drive`;
      what = "a USB drive";
      break;
    case "usb.blocked":
      title = `${subj} was blocked from using a USB drive`;
      what = "a blocked USB drive";
      break;
    case "data.share_copy":
      title = `${subj} copied ${size ?? "files"} to a shared folder`;
      what = `a ${size ? `${size} ` : ""}copy to a shared folder`;
      break;
    case "data.email_attachment":
      title = `${subj} sent a ${size ? `${size} ` : ""}email attachment`;
      what = `a ${size ? `${size} ` : ""}email attachment`;
      break;
    case "net.upload_over_limit":
      title = `${subj} uploaded ${size ?? "files"} to ${domain}`;
      what = `a ${size ? `${size} ` : ""}upload to ${domain}`;
      break;
    case "web.blocked_attempt":
      title = `${subj} was blocked from ${domain}`;
      what = domain;
      break;
    case "software.installed":
      title = `${subj} installed ${product}`;
      what = product;
      break;
    default:
      title = `${pcOf}: ${alertLabel(e)}`;
      what = alertLabel(e).toLowerCase();
  }

  const limitBytes = limitFor(kind, e, ctx.policy);
  const limit =
    bytes && limitBytes
      ? {
          text: `${bytesLabel(bytes)} copied · limit ${bytesLabel(limitBytes)}${bytes > limitBytes ? "" : " · under the limit"}`,
          over: bytes > limitBytes,
        }
      : null;

  const meta = eventMeta(e.type);
  const detail = sentence(detailOf(e));
  const tail =
    limit && limit.over && level === "needs"
      ? " Over your limit, so it needs you."
      : limit && !limit.over
        ? " Under your limit, so it is only worth a look."
        : "";
  const body = `${detail}${tail}`;

  const facts: string[] = [];
  if (size) facts.push(files ? `${size} in ${files.toLocaleString()} ${files === 1 ? "file" : "files"}` : size);
  const where = str(d.device) ?? str(d.drive) ?? str(d.share) ?? str(d.device_name);
  if (where) facts.push(e.type === "data.share_copy" ? `To ${where}` : where);
  if (kind === "remote" && str(d.tool)) facts.push(`${str(d.tool)}${str(d.detected_by) ? `, seen as a ${str(d.detected_by) === "process" ? "running process" : str(d.detected_by)}` : ""}`);
  if (kind === "software" && str(d.product)) facts.push(`${str(d.product)}${str(d.publisher) ? ` by ${str(d.publisher)}` : ""}`);
  if (kind === "web" && domain) facts.push(`${domain}${str(d.category) ? `, category ${str(d.category)}` : ""}`);
  if (group.count > 1) facts.push(`${group.count} times, ${formatTime(group.firstAt)} to ${formatTime(group.lastAt)}`);
  if ((kind === "usb" || kind === "network" || kind === "email") && ctx.policy && !ctx.policy.data_transfer.include_details)
    facts.push("File names off (your privacy setting)");
  facts.push(`On ${host}${person ? `, ${person.name}’s PC` : ""}`);
  if (isHandled(e) && e.handled_by) facts.push(`Marked as fine by ${e.handled_by}`);

  const day = dayGroup(e.occurred_at, ctx.now);
  const ask = ctx.asks?.[String(e.id)];
  const lockedDevice =
    e.type === "data.usb_locked_down" ? ctx.devices?.find((x) => x.id === e.device_id && x.usb_locked_at) : undefined;

  return {
    id: e.id,
    latest: e,
    ids: group.events.map((x) => x.id),
    count: group.count,
    level,
    kind,
    done: isDone(e),
    handled: isHandled(e),
    title,
    body,
    facts,
    why: meta.meaning || WHY[kind],
    ruleHref: e.type === "data.usb_locked_down" ? "/app/team" : `/app/rules#${RULE_AT[kind]}`,
    ruleLink: e.type === "data.usb_locked_down" ? "Restore USB on Team" : ruleLinkFor(kind, e, ctx.policy),
    limit,
    person,
    first,
    pc: host,
    time: formatTime(e.occurred_at),
    dayKey: day.key,
    dayLabel: day.label,
    draft: askDraft(kind, first, what, whenWords(e.occurred_at, ctx.now)),
    ask,
    lockedPc: lockedDevice,
  };
}

/** device → person (member_id from current backends; older ones only name the member). */
export function makePersonFor(members: Member[] | undefined, devices: Device[] | undefined): (deviceId: number) => Member | undefined {
  const byMember = new Map((members ?? []).map((m) => [m.id, m] as const));
  const byDevice = new Map<number, Member>();
  for (const d of devices ?? []) {
    const person =
      d.member_id != null ? byMember.get(d.member_id) : (members ?? []).find((m) => m.is_active && m.name === d.member_name);
    if (person) byDevice.set(d.id, person);
  }
  return (deviceId: number) => byDevice.get(deviceId);
}
