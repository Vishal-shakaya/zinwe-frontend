/**
 * Ready-made notes for messaging a team member: a tag says what the note is
 * for (it becomes the subject they see in their widget and email), the text is
 * a sensible first draft, and each has a default urgency. Alert tags adapt to
 * the alert (the tool, website or app involved).
 */
import type { DeviceEvent, EventSeverity, MessageChannel } from "../../lib/api";
import type { DashIconName } from "../components/DashIcon";
import { subjectOf, detailOf } from "./alertGroups";
import { eventMeta, type FeatureKey } from "./events";

export type Urgency = EventSeverity; // "info" | "warning" | "critical"

export const URGENCY: ReadonlyArray<{ value: Urgency; label: string; hint: string }> = [
  { value: "info", label: "Normal", hint: "A heads-up" },
  { value: "warning", label: "Important", hint: "Please take note" },
  { value: "critical", label: "Urgent", hint: "Needs action now" },
];

export interface MessageTag {
  id: string;
  /** The chip, short: what the owner is picking. */
  label: string;
  /** The subject line the member sees (widget + email). Defaults to the label. */
  subject?: string;
  icon: DashIconName;
  urgency: Urgency;
  /** First draft of the note. `first` = their first name. */
  draft: (first: string, ctx: TagContext) => string;
}

export interface TagContext {
  /** What the alert was about, e.g. "UltraViewer" or "youtube.com". */
  subject: string | null;
  /** One plain line describing the alert. */
  detail: string | null;
  /** The alert's own suggested note, if any. */
  suggested: string;
  feature: FeatureKey | null;
}

const thing = (c: TagContext) => c.subject ?? "this";

/**
 * Tags for everyday notes (Chat page and chat bubble), most used first. Each says plainly what the
 * owner wants from the person; the Zinwe-specific ones (update, work day, data rules) point at
 * something the member can actually do in the widget or on their PC.
 */
const GENERAL: readonly MessageTag[] = [
  {
    id: "question",
    label: "Quick question",
    subject: "A quick question",
    icon: "help",
    urgency: "info",
    draft: (first) => `Hi ${first}, quick question: `,
  },
  {
    id: "task",
    label: "Task for today",
    subject: "Please do this today",
    icon: "check",
    urgency: "warning",
    draft: (first) => `Hi ${first}, please take care of this today: `,
  },
  {
    id: "call",
    label: "Call me",
    subject: "Please call me",
    icon: "phone",
    urgency: "warning",
    draft: (first) => `Hi ${first}, please call me or come and see me when you have a minute.`,
  },
  {
    id: "update",
    label: "Update Zinwe",
    subject: "Please update Zinwe",
    icon: "refresh",
    urgency: "warning",
    draft: (first) =>
      `Hi ${first}, a new version of Zinwe is ready. Please open the Zinwe widget on your PC and click Update. It takes about a minute.`,
  },
  {
    id: "workday",
    label: "Log your day",
    subject: "Please log your work day",
    icon: "clock",
    urgency: "info",
    draft: (first) =>
      `Hi ${first}, please use the Zinwe widget to log in when you start, mark your breaks and log out at the end of the day, so your hours are counted correctly.`,
  },
  {
    id: "data",
    label: "Data rules",
    subject: "Reminder: how we handle company files",
    icon: "shield",
    urgency: "info",
    draft: (first) =>
      `Hi ${first}, a quick reminder: please keep company files on work PCs and work accounts — no personal USB drives, personal cloud storage or personal email. Ask me if you need to share something.`,
  },
  {
    id: "thanks",
    label: "Thank you",
    subject: "Thank you",
    icon: "team",
    urgency: "info",
    draft: (first) => `Hi ${first}, thank you for your help today!`,
  },
];

/** Tags offered on an alert, most relevant first. */
function alertTags(feature: FeatureKey | null): readonly MessageTag[] {
  const explain: MessageTag = {
    id: "explain",
    label: "Please explain",
    subject: "Can you explain this?",
    icon: "help",
    urgency: "info",
    draft: (first, c) =>
      c.subject
        ? `Hi ${first}, Zinwe flagged ${c.subject} on your PC. Could you tell me what it was for?`
        : `Hi ${first}, Zinwe flagged this on your PC${c.detail ? `: ${c.detail}` : ""}. Could you tell me what it was for?`,
  };
  const warn: MessageTag = {
    id: "warning",
    label: "Warning",
    subject: "Please be careful",
    icon: "alert",
    urgency: "warning",
    draft: (first, c) => c.suggested || `Hi ${first}, please be careful with ${thing(c)} on your work PC.`,
  };
  const stop: MessageTag = {
    id: "stop",
    label: "Stop now",
    subject: "Please stop now",
    icon: "close",
    urgency: "critical",
    draft: (first, c) => `Hi ${first}, please stop using ${thing(c)} right away and call me.`,
  };
  const ok: MessageTag = {
    id: "ok",
    label: "All clear",
    icon: "check",
    urgency: "info",
    draft: (first, c) => `Hi ${first}, I saw the alert about ${thing(c)} — that's fine, no action needed. Thanks!`,
  };
  const specific: MessageTag[] = [];
  if (feature === "remote") {
    specific.push({
      id: "uninstall",
      label: "Remove the tool",
      subject: "Please remove this tool",
      icon: "screen",
      urgency: "warning",
      draft: (first, c) =>
        `Hi ${first}, ${c.subject ?? "this remote-access tool"} isn't approved on work PCs. Please close and uninstall it today.`,
    });
  } else if (feature === "internet") {
    specific.push({
      id: "site",
      label: "Avoid this site",
      subject: "Please avoid this website",
      icon: "globe",
      urgency: "warning",
      draft: (first, c) => `Hi ${first}, please don't open ${c.subject ?? "that website"} on your work PC.`,
    });
  } else if (feature === "data") {
    specific.push({
      id: "data",
      label: "Confirm the copy",
      subject: "Please confirm this file copy",
      icon: "usb",
      urgency: "warning",
      draft: (first) => `Hi ${first}, Zinwe saw a large copy of files from your PC. Was it for work? Please confirm.`,
    });
  }
  return [explain, warn, ...specific, stop, ok];
}

export function contextOf(event: DeviceEvent | null): TagContext {
  if (!event) return { subject: null, detail: null, suggested: "", feature: null };
  const meta = eventMeta(event.type);
  return { subject: subjectOf(event), detail: detailOf(event), suggested: meta.suggested, feature: meta.feature };
}

/** The tags to offer: alert-specific ones when there's an alert, general ones otherwise. */
export function tagsFor(event: DeviceEvent | null): readonly MessageTag[] {
  return event ? alertTags(contextOf(event).feature) : GENERAL;
}

/** The subject the member sees: the tag, plus the alert's name when there is one. */
export function subjectLine(tag: MessageTag | null, event: DeviceEvent | null, fallback: string): string {
  const alert = event ? eventMeta(event.type).label : null;
  const parts = [tag ? (tag.subject ?? tag.label) : null, alert].filter(Boolean) as string[];
  return (parts.length ? parts.join(" · ") : fallback).slice(0, 120);
}

/** How a note reaches the person (same values as the API's MessageChannel). */
export const DELIVERIES: ReadonlyArray<{ value: MessageChannel; label: string; icon: DashIconName; note: string }> = [
  { value: "chat", label: "Chat", icon: "chat", note: "The Zinwe widget on their PC" },
  { value: "chat_email", label: "Chat + email", icon: "share", note: "Their PC, plus a copy in their inbox" },
  { value: "email", label: "Email only", icon: "mail", note: "Their inbox only, not their PC" },
];

/** A draft as a one-line preview: without the "Hi Asha, " greeting, capitalised; open-ended drafts end in "…". */
export function draftPreview(draft: string): string {
  const text = draft.replace(/^Hi [^,]+, /, "").trim();
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return capital.endsWith(":") ? `${capital} …` : capital;
}

/**
 * Until the owner picks "Send via" themselves, a Normal note goes to the widget only and an Important or
 * Urgent one also by email, so "Thanks, noted" never lands in someone's inbox (J5-14).
 */
export function deliveryFor(urgency: Urgency): MessageChannel {
  return urgency === "info" ? "chat" : "chat_email";
}
