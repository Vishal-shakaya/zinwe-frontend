import { sample, sampleStore, SAMPLES_ON } from "./index";

/**
 * SAMPLE (DashTopBar): the bell's notification history. The API only serves "what's new since" for browser
 * notifications (GET notifications/?since=), not a history with read state, so the list is sample data.
 * Each item says where it opens and links there (#m=<first>, tab paths, #task=<id>).
 * SAMPLES_ON off (production): no notes, and the bell is not shown.
 */

export type NoteKind = "break" | "chat" | "alert" | "task" | "payment";

export interface OwnerNote {
  id: string;
  kind: NoteKind;
  /** For chat items: the person (first name, lower case) whose unread chat keeps it unread. */
  who?: string;
  title: string;
  body: string;
  ago: string;
  opens: string;
  href: string;
  read: boolean;
}

const NOTES: OwnerNote[] = [
  { id: "n-break", kind: "break", title: "Emily wants a break approved", body: "Lunch since 1:38 PM, 42 minutes so far. Waiting for your OK.", ago: "42 min ago", opens: "Activity, Emily highlighted", href: "/app/activity#m=emily", read: false },
  { id: "n-emily", kind: "chat", who: "emily", title: "Emily sent a message", body: "“Taking lunch now, back by 2:30.”", ago: "42 min ago", opens: "Chat with Emily", href: "/app/chat#m=emily", read: false },
  { id: "n-karan", kind: "chat", who: "karan", title: "Karan replied in Chat", body: "“Pitch videos for the Austin meeting.”", ago: "11:52 AM", opens: "Chat with Karan, at his reply", href: "/app/chat#m=karan", read: false },
  { id: "n-alert", kind: "alert", title: "Karan copied 1.8 GB to a pen drive", body: "Over your 500 MB limit, so it needs you.", ago: "3 h ago", opens: "Alerts", href: "/app/alerts", read: false },
  { id: "n-task", kind: "task", title: "Arjun finished a task", body: "Ship the client-portal login fix. Waiting for your OK.", ago: "3 h ago", opens: "Tasks, task open", href: "/app/tasks#task=3", read: false },
  { id: "n-pay", kind: "payment", title: "Payment confirmed", body: "Businesses plan, 23 Oct – 23 Nov. The receipt is in your email.", ago: "Fri 23 Oct", opens: "Plan & billing", href: "/app/settings/billing", read: true },
];

const store = sampleStore<OwnerNote[]>("notes", () => NOTES);

export function listNotes(signal?: AbortSignal): Promise<OwnerNote[]> {
  if (!SAMPLES_ON) return sample([], signal, 0);
  return sample(store.get(), signal, 120);
}

export function markNotesRead(ids: readonly string[] | "all"): OwnerNote[] {
  if (!SAMPLES_ON) return [];
  const next = store.get().map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n));
  store.set(next);
  return next;
}
