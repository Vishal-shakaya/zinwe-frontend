/**
 * Ready-made notes for messaging a team member: a tag says what the note is
 * for (it becomes the subject they see in their widget and email), the text is
 * a sensible first draft, and each has a default urgency. Alert tags adapt to
 * the alert (the tool, website or app involved).
 */
import type { DeviceEvent, EventSeverity } from "../../lib/api";
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
  label: string;
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

/** Tags that fit any note (also used on the Chat page). */
const GENERAL: readonly MessageTag[] = [
  {
    id: "fyi",
    label: "FYI",
    icon: "chat",
    urgency: "info",
    draft: (first) => `Hi ${first}, just a quick note: `,
  },
  {
    id: "reminder",
    label: "Policy reminder",
    icon: "shield",
    urgency: "info",
    draft: (first) =>
      `Hi ${first}, a quick reminder to follow our company IT rules on your work PC. Thanks for keeping our data safe.`,
  },
  {
    id: "action",
    label: "Action needed",
    icon: "alert",
    urgency: "warning",
    draft: (first) => `Hi ${first}, please take care of this today: `,
  },
  {
    id: "meet",
    label: "Let's talk",
    icon: "team",
    urgency: "info",
    draft: (first) => `Hi ${first}, can you drop by or call me when you have a minute?`,
  },
];

/** Tags offered on an alert, most relevant first. */
function alertTags(feature: FeatureKey | null): readonly MessageTag[] {
  const explain: MessageTag = {
    id: "explain",
    label: "Please explain",
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
    icon: "alert",
    urgency: "warning",
    draft: (first, c) => c.suggested || `Hi ${first}, please be careful with ${thing(c)} on your work PC.`,
  };
  const stop: MessageTag = {
    id: "stop",
    label: "Stop now",
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
      icon: "screen",
      urgency: "warning",
      draft: (first, c) =>
        `Hi ${first}, ${c.subject ?? "this remote-access tool"} isn't approved on work PCs. Please close and uninstall it today.`,
    });
  } else if (feature === "internet") {
    specific.push({
      id: "site",
      label: "Avoid this site",
      icon: "globe",
      urgency: "warning",
      draft: (first, c) => `Hi ${first}, please don't open ${c.subject ?? "that website"} on your work PC.`,
    });
  } else if (feature === "data") {
    specific.push({
      id: "data",
      label: "Confirm the copy",
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
  const parts = [tag?.label, alert].filter(Boolean) as string[];
  return (parts.length ? parts.join(" · ") : fallback).slice(0, 120);
}
