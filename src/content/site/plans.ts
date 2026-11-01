/**
 * Plans v3.1 copy (board SitePlans, owner 29 Oct 2026), word for word. PRICES, PC LIMITS AND HISTORY are never
 * typed here: they come from the plan catalogue (GET /api/auth/plans/, Admin › Plans), so the cards, the headline
 * cap, the per-PC maths and the compare table's first two rows always match what an owner pays.
 * Only what each plan really includes today (rule "only shipped features", 29 Oct): every plan has every feature
 * except `reports_pro` (PDF reports, emailed and scheduled: paid plans); plans differ by PCs and history kept;
 * Startups and Teams have email support, Businesses priority support and a guided setup call. The prototype's
 * proposed extras (major alerts by email, performance, one person on two PCs) stay off until their backends
 * ship; tasks (FR-20) are on every plan since 1.3.1: see .claude/dev/docs/06-website-portal.md. Copy is keyed by plan code; an unknown code falls back
 * to the API's own feature list.
 *
 * v1.3.2 (owner 31 Oct): the cards stay short and the compare table holds every feature, with a Protection group.
 * Each line names the backend module that switches it
 * on (zinwe-backend z_auth/entitlements.py, the plan's `modules` in GET /api/auth/plans/), so a tick is shown only
 * when that plan's modules really include it; `cells` is the same answer for the static pre-render and while the
 * catalogue loads. No module = not plan-gated (on every plan).
 */
import type { PlanModule } from "../../lib/api/types.ts";


export interface PlanCopy {
  tag: string;
  /** [text, strong (a real addition), isNew (1.3)] */
  points: ReadonlyArray<readonly [string, boolean, boolean]>;
}

export const PLAN_COPY: Record<string, PlanCopy> = {
  free: {
    tag: "Try Zinwe on your own office PCs, free.",
    points: [
      ["Every protection and team feature", true, false],
      ["USB, app and website rules", true, false],
      ["Chat, tasks and work hours", true, false],
      ["Plain-English alerts, no logs to read", true, false],
      ["Guided setup", true, false],
    ],
  },
  startups: {
    tag: "For small teams who want Zinwe to report to them.",
    points: [
      ["Everything in Free", false, false],
      ["A PDF report in your inbox, daily, weekly or monthly", true, true],
      ["Email support", true, false],
      ["Your rules and history move with you", true, false],
      ["Pay monthly or yearly, no auto-charge", true, false],
    ],
  },
  teams: {
    tag: "For growing offices that need more PCs and a longer history.",
    points: [
      ["Everything in Startups", false, false],
      ["Room for a growing team", true, false],
      ["Reports per person: hours, tasks and apps", true, false],
      ["Email an alert to the person it's about", true, false],
      ["Email support", true, false],
    ],
  },
  businesses: {
    tag: "For larger offices that need records to show clients and auditors.",
    points: [
      ["Everything in Teams", false, false],
      ["Priority support: we answer you first", true, false],
      ["A guided setup call for your whole team", true, false],
      ["A full year of records to look back on", true, false],
      ["Work hours and break approvals for everyone", true, false],
    ],
  },
};

export const PLANS_HERO = {
  eyebrow: "Plans and pricing",
  /** {cap} = less than the highest per-PC monthly price of any paid plan, from the catalogue. */
  title: "Protect every PC and run your team, from less than {cap} per PC a month.",
  lead: "Priced per PC, not per person. Start free on 3 PCs and move up when you want reports in your inbox, more PCs or a longer history. No card, no auto-charge.",
} as const;

export const PROMISES: ReadonlyArray<{ t: string; b: string; icon: string }> = [
  { t: "Free forever on 3 PCs", b: "Not a trial. No card.", icon: "M20 6 9 17l-5-5" },
  { t: "Nothing charged automatically", b: "You pay each period yourself.", icon: "M3 10h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" },
  { t: "Change or stop any time", b: "Your data stays with you.", icon: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" },
  {
    t: "Free setup call",
    b: "20 minutes with us.",
    icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  },
];

/**
 * {pcs} / {history} = that plan's PC limit and history, from the catalogue (by `code`); `fallback` is shown while the
 * catalogue loads or if it can't be read.
 */
export const WHY: ReadonlyArray<{ plan: string; code: string; tone: string; pain: string; fix: string; how: string; fallback?: string }> = [
  { plan: "Startups", code: "startups", tone: "tone-green", pain: "I don’t have time to open a dashboard every day.", fix: "The week arrives in your inbox.", how: "A PDF report on the day you choose: daily, weekly or monthly." },
  {
    plan: "Teams",
    code: "teams",
    tone: "tone-orange",
    pain: "We’ve outgrown our plan, and we need to look further back.",
    fix: "Room for the whole office, and a longer memory.",
    how: "Up to {pcs} PCs and {history} of alerts and activity, with the same PDF reports in your inbox.",
    fallback: "More PCs and a longer history of alerts and activity, with the same PDF reports in your inbox.",
  },
  { plan: "Businesses", code: "businesses", tone: "tone-ink", pain: "Our clients and auditors ask for records.", fix: "A full year of history, ready to show.", how: "Twelve months of alerts and activity, priority support, and we set up your whole team with you." },
];

/**
 * y = included, n = not included, anything else = the text shown. The first two rows (PCs, history) are built from the
 * API. A row with a `module` is ticked from each plan's `modules`; `cells` is the same answer, in plan order
 * (Free forever, Startups, Teams, Businesses), for the static page and while the catalogue loads.
 */
export type Cell = "y" | "n" | string;
export type CompareRow = { group: string } | { f: string; isNew?: boolean; module?: PlanModule; cells: readonly [Cell, Cell, Cell, Cell] };

export const COMPARE_ROWS: readonly CompareRow[] = [
  { group: "PROTECTION" },
  { f: "USB drives: allow, read-only or block", module: "usb_control", cells: ["y", "y", "y", "y"] },
  { f: "Pen drive and file-copy alerts", module: "usb_alerts", cells: ["y", "y", "y", "y"] },
  { f: "Data transfer alerts: network folders, Outlook and uploads", module: "data_transfer", cells: ["y", "y", "y", "y"] },
  { f: "App blocking: AnyDesk, TeamViewer and other remote-access apps", module: "remote_access", cells: ["y", "y", "y", "y"] },
  { f: "New software alerts", module: "software_installs", cells: ["y", "y", "y", "y"] },
  { f: "Website blocking, by kind of site or by name", module: "web", cells: ["y", "y", "y", "y"] },
  { f: "Internet data used, by app and by website", module: "web", cells: ["y", "y", "y", "y"] },
  { f: "Data safety: what left each PC, and how", module: "usb_alerts", cells: ["y", "y", "y", "y"] },
  { f: "Plain-English alerts in the dashboard", cells: ["y", "y", "y", "y"] },
  { f: "Email an alert to the person it's about", module: "alert_to_employee", cells: ["y", "y", "y", "y"] },
  { group: "TEAM" },
  { f: "Chat with each person", module: "team_chat", cells: ["y", "y", "y", "y"] },
  { f: "Tasks with steps, due dates and approvals", module: "team_chat", cells: ["y", "y", "y", "y"] },
  { f: "Work hours and break approvals", module: "work_time", cells: ["y", "y", "y", "y"] },
  { f: "App usage: which apps, and for how long", module: "app_usage", cells: ["y", "y", "y", "y"] },
  { f: "Team pictures: a face for each person", cells: ["y", "y", "y", "y"] },
  { group: "REPORTS" },
  { f: "Reports on screen and CSV", cells: ["y", "y", "y", "y"] },
  { f: "PDF reports emailed on a schedule", isNew: true, module: "reports_pro", cells: ["n", "y", "y", "y"] },
  { group: "SUPPORT" },
  { f: "Help", cells: ["Help pages", "Email", "Email", "Priority"] },
  { f: "Guided setup call for your team", cells: ["n", "n", "n", "y"] },
];

/** {first} = the first paid plan's PC limit, {top} / {topName} = the largest plan's. */
export const PLANS_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  { q: "What does every plan include?", a: "Every protection: USB block or read-only, app blocking for remote-access tools, website blocking, data transfer alerts, internet data and Data safety, with plain-English alerts. Every team feature: chat, tasks, work hours with break approvals, app usage and team pictures. And reports on screen with a CSV download. Paid plans add more PCs, a longer history and PDF reports emailed to you." },
  { q: "Is GST included in the price?", a: "In India the price you see is before 18% GST; the card shows the total with GST too, and every payment gets a GST invoice. Outside India you pay in US dollars with no Indian GST." },
  { q: "Will I be charged automatically?", a: "No. Each payment covers one month or one year. We email you before it ends, and you pay for the next one only if you want to." },
  { q: "Can I change plans later?", a: "Yes, any time from Billing in your dashboard. Moving up starts right away; your rules, chats, tasks and history all stay." },
  { q: 'What does "Up to {first} PCs" mean?', a: "The number of Windows PCs with Zinwe connected. People are free: two people sharing one PC count once." },
  { q: "Which currency will I pay in?", a: "Pick it in the Currency menu above. Businesses in India pay in rupees by UPI, card or bank transfer. Everyone else pays in US dollars by card or bank transfer." },
  { q: "How many PCs can a plan cover?", a: "Up to {top} PCs, on {topName}, our biggest plan." },
];

export const PLANS_CLOSE = {
  title: "Start on Free. Move up in one click.",
  body: "Your rules, chats, tasks and history come with you when you change plan.",
} as const;

/** "{x}" placeholders filled from the catalogue. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** "7 days", "90 days", "1 year", "Unlimited". */
export function historyLabel(days: number | undefined): string {
  if (!days) return "Unlimited";
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  return `${days} days`;
}
