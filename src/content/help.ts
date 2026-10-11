/**
 * Copy for the dashboard's Help section (/app/help/*). Plain words for a busy
 * owner with no IT team — short steps, each pointing at the screen that does it.
 */
import type { DashIconName } from "../dashboard/components/DashIcon";

export interface GuideStep {
  title: string;
  body: string;
  /** In-app link that does this step. */
  to: string;
  cta: string;
  icon: DashIconName;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    title: "Add your team",
    body: "Add each person with their name and work email. Zinwe gives every person their own ID — no shared passwords.",
    to: "/app/team",
    cta: "Open Team & devices",
    icon: "team",
  },
  {
    title: "Install Zinwe on their PC",
    body: "Download Zinwe on their Windows PC and sign in with their email and ID. Use “Share on text” to send them the details. The PC shows up within about a minute.",
    to: "/app/team",
    cta: "Share someone's ID",
    icon: "pc",
  },
  {
    title: "Choose what to protect",
    body: "Turn on Online protection (risky websites), Data safety (USB drives and large uploads) and App monitoring (remote-control tools). One setup covers every PC.",
    to: "/app/internet",
    cta: "Set up protection",
    icon: "shield",
  },
  {
    title: "Check your Overview",
    body: "See who's working and any alerts that need you. Each alert has a one-click action — send the person a message or review the rule.",
    to: "/app",
    cta: "Go to Overview",
    icon: "home",
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: readonly Faq[] = [
  {
    q: "A PC says “Offline”. Is it still protected?",
    a: "Yes. Rules run on the PC itself, so they keep working without internet. “Offline” only means it hasn't checked in for 3 minutes — usually it's switched off.",
  },
  {
    q: "Someone lost their ID or left the company.",
    a: "On Team & devices, use “New ID” to replace a lost ID (the old one stops working straight away), or “Remove” to disconnect someone who has left.",
  },
  {
    q: "How fast do my changes reach the PCs?",
    a: "Within about a minute. Every PC picks up your latest setup the next time it checks in.",
  },
  {
    q: "Can my team see that Zinwe is running?",
    a: "Yes, always. Each PC shows a small Zinwe widget with the active rules. Zinwe is monitoring your team can see — never hidden spyware.",
  },
  {
    q: "How do I change my plan or get a receipt?",
    a: "Go to Settings → Billing for your plan and payments. For plan changes or receipts, email hello@zinwe.io.",
  },
];

export interface PolicyRow {
  label: string;
  detail: string;
}

/** What the agent collects and shares with the account owner, across every feature. */
export const COLLECTED: readonly PolicyRow[] = [
  { label: "Who's working", detail: "When a PC is in use, on a break or switched off, and the hours worked each day." },
  { label: "Websites and apps", detail: "The website's name only (e.g. youtube.com) and which app is open, with the time spent." },
  { label: "Data leaving a PC", detail: "Copies to USB drives, shared folders, uploads and email attachments — counts and sizes, not contents." },
  { label: "Remote-control tools", detail: "When tools like AnyDesk or TeamViewer run, and new software being installed." },
  { label: "Blocked attempts", detail: "When someone tries something your rules block, and when." },
];

export const NEVER: readonly string[] = [
  "Keystrokes or anything typed",
  "Screenshots, screen or camera recording",
  "The contents of files, emails or messages",
  "Full web addresses, page contents or search terms",
  "Anything on personal devices you haven't connected",
];

export interface PolicyPoint {
  title: string;
  body: string;
}

export const COMMITMENTS: readonly PolicyPoint[] = [
  {
    title: "Your team always knows",
    body: "Every PC shows the active rules in the Zinwe widget. Tell your team before you connect their PC — it builds trust.",
  },
  {
    title: "Only you see your data",
    body: "Usage and alerts are visible only to your company's Zinwe account.",
  },
  {
    title: "Built for India's DPDP Act",
    body: "Zinwe collects only what each feature needs, for a clear purpose, and rolls usage up by the hour instead of keeping a minute-by-minute log.",
  },
  {
    title: "You're in control",
    body: "Turn any feature off at any time from its page. Removing a person stops their PC checking in straight away.",
  },
];
