/** The first-visit dashboard tour: its steps and the "seen it" flag (per browser). */
import type { DashIconName } from "../components/DashIcon";

export interface TourStep {
  /** CSS selector of the element to point at (falls back to a centred card when it isn't on screen). */
  target: string;
  title: string;
  body: string;
  icon: DashIconName;
}

/** The first-visit walk through the dashboard. Targets are `data-tour` hooks in AppLayout. */
export const DASHBOARD_TOUR: readonly TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: "Your day at a glance",
    body: "Overview shows who's working, who's on a break and the newest alerts — start here each morning.",
    icon: "home",
  },
  {
    target: '[data-tour="alerts"]',
    title: "Alerts that need you",
    body: "Every risky thing on your PCs, sorted by priority. One click emails the person about it.",
    icon: "alert",
  },
  {
    target: '[data-tour="protection"]',
    title: "Choose what to protect",
    body: "Turn on Online protection, Data safety and App monitoring. One setup covers every PC.",
    icon: "shield",
  },
  {
    target: '[data-tour="team"]',
    title: "Add your team",
    body: "Each person gets their own ID to connect their PC. Their tile shows the PC and a week of activity.",
    icon: "team",
  },
  {
    target: '[data-tour="chat"]',
    title: "Message anyone",
    body: "Notes pop up in the Zinwe widget on their PC and arrive by email. Replies come back here.",
    icon: "chat",
  },
  {
    target: '[data-tour="activity"]',
    title: "How the day went",
    body: "When each person started, every break and why, and when they finished. Approve or deny breaks here.",
    icon: "activity",
  },
  {
    target: '[data-tour="support"]',
    title: "We're here to help",
    body: "Stuck? Message the Zinwe team from here any time. You can replay this tour from Help.",
    icon: "help",
  },
];

const STORAGE_KEY = "zinwe.tour.v1.done";

export function tourDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // storage blocked: never nag
  }
}

export function markTourDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage blocked */
  }
}

/** Ask the dashboard shell to replay the tour (Help → "Take the tour"). */
export function startTour(): void {
  window.dispatchEvent(new Event("zinwe:tour"));
}
