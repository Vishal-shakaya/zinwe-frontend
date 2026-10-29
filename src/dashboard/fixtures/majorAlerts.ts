import { sample, sampleStore, SAMPLES_ON } from "./index";

/**
 * SAMPLE (DashAlerts, DashOverview "Needs you"): the "major alerts" layer the API does not serve yet (FR-35).
 *
 * Real today: the alerts themselves (GET events?kind=alert), their level (severity), Mark as fine
 * (POST events/<id>/handled/) and the message to the person (POST members/<id>/message/).
 * Not served yet, so kept here:
 *  - the link between an alert and the question the owner asked about it ("Asked · waiting for reply"),
 *    and the member's reply on the alert (Asked · replied) — FR-35 will store both on the event;
 *  - the board's wording: the level legend, the kind Ask message per alert type, and "Why it matters".
 *
 * When FR-35 ships: `listAsks` reads the event's ask/reply fields and `recordAsk` goes away (sending the
 * message with the event id records it); the wording moves to the API's alert catalogue.
 * SAMPLES_ON off (production): the wording stays (it is copy, not data), but no "Asked" marks are kept or shown;
 * the question itself is still sent for real and lands in Chat.
 */

/** The board's levels: Needs you (critical), Worth a look (warning), Handled automatically (info). */
export type AlertLevel = "needs" | "worth" | "auto";

/** The legend lines, word for word (tab and level-pill tooltips on Alerts and Overview). */
export const LEVEL_LABEL: Record<AlertLevel, string> = {
  needs: "Needs you",
  worth: "Worth a look",
  auto: "Handled automatically",
};

export const LEVEL_DEF: Record<AlertLevel | "done", string> = {
  needs: "a transfer over your limit, a remote-control session, or anything blocked that someone tried again.",
  worth: "small copies, new software, and blocked sites.",
  auto: "normal activity, nothing to do.",
  done: "alerts you marked as fine, and normal activity Zinwe handled on its own. They stay here for your plan’s history.",
};

/** The board's alert types (Type filter, icon, which Rules section the rule link opens). */
export type AlertKind = "usb" | "remote" | "software" | "web" | "email" | "network" | "upload" | "other";

export const KIND_LABEL: ReadonlyArray<readonly [AlertKind | "all", string]> = [
  ["all", "All types"],
  ["usb", "USB drives"],
  ["remote", "Remote-control apps"],
  ["software", "New software"],
  ["web", "Websites"],
  ["email", "Email attachments"],
  ["network", "Shared folders"],
  ["upload", "Uploads"],
];

/** Why it matters, per type (the board's second box when an alert is open). */
export const WHY: Record<AlertKind, string> = {
  usb: "A big copy to a pen drive is the most common way client files leave an office. Usually there’s a good reason.",
  remote: "Remote-control apps can hand your PC to someone outside. Even blocked tries are worth a quick word.",
  software: "File-sharing apps and unknown programs can expose the PC and download unwanted software.",
  web: "Repeated tries on a blocked site can mean a link in an email or an ad.",
  email: "Large attachments can carry client data out of the office.",
  network: "A big copy to an unknown shared folder can mean client files leaving the office.",
  upload: "A large upload to a website can mean client files leaving the office.",
  other: "Shown so nothing goes unseen.",
};

/** The kind Ask wording (it asks, it doesn't accuse); the owner edits it freely in the sheet. */
export function askDraft(kind: AlertKind, first: string, what: string, when: string): string {
  const hi = first ? `Hi ${first}, ` : "Hi, ";
  switch (kind) {
    case "remote":
      return `${hi}Zinwe saw ${what} on your PC ${when}. Do you need remote access for a client? Tell me and I’ll set it up properly.`;
    case "usb":
      return `${hi}Zinwe flagged ${what} ${when}. Was it for work? Just checking.`;
    case "network":
      return `${hi}Zinwe saw ${what} ${when}. Which machine was it? Just want to make sure it is ours.`;
    case "email":
      return `${hi}Zinwe flagged ${what} ${when}. Was it for a client? Just checking.`;
    case "upload":
      return `${hi}Zinwe saw ${what} ${when}. Was it for work? Just checking.`;
    case "web":
      return `${hi}Zinwe blocked ${what} ${when}. If a link sent you there, let me know so I can warn the team.`;
    case "software":
      return `${hi}I saw ${what} was installed on your PC ${when}. Do you need it for work? If not, could you remove it?`;
    default:
      return `${hi}Zinwe flagged ${what} on your PC ${when}. Can you tell me what happened? Just checking.`;
  }
}

/** One question the owner asked about an alert (FR-35 will keep this on the event). */
export interface AlertAsk {
  /** ISO time it was sent. */
  at: string;
  memberId: number;
  /** The message id the API returned. */
  messageId: number | null;
  /** The member's reply, once FR-35 links it to the alert (never filled by the sample). */
  reply?: { at: string; text: string };
}

/** Asks by event id. */
export type AlertAsks = Record<string, AlertAsk>;

const store = sampleStore<AlertAsks>("alertAsks", () => ({}));

/** Fired after an ask is recorded, so Overview and Alerts stay in step. */
export const ASKS_CHANGED_EVENT = "zinwe:alert-asks-changed";

/** GET the asks (sample loader, same shape as an API call). */
export function listAsks(signal?: AbortSignal): Promise<AlertAsks> {
  if (!SAMPLES_ON) return sample({}, signal, 0);
  return sample(store.get(), signal, 0);
}

/** Record that the owner asked about these alerts (every event of a folded row). */
export function recordAsk(eventIds: readonly number[], ask: AlertAsk): AlertAsks {
  if (!SAMPLES_ON) return {};
  const next = { ...store.get() };
  for (const id of eventIds) next[String(id)] = ask;
  store.set(next);
  window.dispatchEvent(new Event(ASKS_CHANGED_EVENT));
  return next;
}
