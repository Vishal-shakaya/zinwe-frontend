/**
 * The first-visit dashboard tour: its steps and the "seen it" flag. Seen is stored on the account
 * (`user.tour_done`, POST tour/done/), so the tour plays once per account, not once per browser
 * (J5-25). The browser flag stays as a fallback for an older backend without the field.
 */
import type { DashIconName } from "../components/DashIcon";
import { markTourDoneOnServer, type User } from "../../lib/api";

export interface TourStep {
  /** CSS selector of the element to point at (falls back to a centred card when it isn't on screen). */
  target: string;
  title: string;
  body: string;
  icon: DashIconName;
  /** The last step's main button: where finishing the tour takes the owner. */
  cta?: { label: string; to: string };
}

/**
 * The first-visit walk through the dashboard. Targets are `data-tour` hooks in AppLayout. It ends on
 * the one thing a new owner has to do: add the first person (J5-06).
 */
export const DASHBOARD_TOUR: readonly TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: "Your day at a glance",
    body: "Overview shows who's working, who's on a break and the alerts that need you — start here each morning.",
    icon: "home",
  },
  {
    target: '[data-tour="alerts"]',
    title: "Alerts that need you",
    body: "Every risky thing on your PCs, in plain words, with what it means. One click messages the person about it.",
    icon: "alert",
  },
  {
    target: '[data-tour="protection"]',
    title: "Choose what to protect",
    body: "Online protection, Data safety and App monitoring start with safe settings. One setup covers every PC.",
    icon: "shield",
  },
  {
    target: '[data-tour="chat"]',
    title: "Message anyone",
    body: "Notes pop up in the Zinwe widget on their PC, and by email when it's important. Replies come back here.",
    icon: "chat",
  },
  {
    target: '[data-tour="activity"]',
    title: "How the day went",
    body: "When each person logged in, every break and why, and when they logged out. Approve breaks or ask about them.",
    icon: "activity",
  },
  {
    target: '[data-tour="support"]',
    title: "We're here to help",
    body: "Stuck? Message the Zinwe team from here, or from Support in your account menu (bottom left). Replay this tour from How to use.",
    icon: "help",
  },
  {
    target: '[data-tour="team"]',
    title: "Add your first person",
    body: "Add their name and work email. Zinwe gives them their own ID; install Zinwe on their PC with it and they show up here.",
    icon: "team",
    cta: { label: "Add your first person", to: "/app/team?add=1" },
  },
];

const STORAGE_KEY = "zinwe.tour.v1.done";

function seenOnThisBrowser(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // storage blocked: never nag
  }
}

/** The owner has finished or skipped the tour, on any device (account flag) or on this browser. */
export function tourDone(user: Pick<User, "tour_done"> | null | undefined): boolean {
  return user?.tour_done === true || seenOnThisBrowser();
}

/** Seen on this browser before the account kept the flag: tell the account, so other devices skip it too. */
export function syncTourFlag(user: Pick<User, "tour_done"> | null | undefined): void {
  if (user?.tour_done === false && seenOnThisBrowser()) {
    markTourDoneOnServer().catch(() => {
      /* try again next visit */
    });
  }
}

/** Remember the tour as seen: on the account (all devices) and on this browser. Failures are quiet. */
export function markTourDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage blocked */
  }
  markTourDoneOnServer().catch(() => {
    /* offline or an older backend: this browser still remembers */
  });
}

/** Ask the dashboard shell to replay the tour (How to use → "Take the tour"). */
export function startTour(): void {
  window.dispatchEvent(new Event("zinwe:tour"));
}
