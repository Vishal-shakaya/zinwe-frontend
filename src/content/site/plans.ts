/**
 * Plans v3.1 copy (board SitePlans, owner 29 Oct 2026), word for word. PRICES, PC LIMITS AND HISTORY are never
 * typed here: they come from the plan catalogue (GET /api/auth/plans/, Admin › Plans), so the cards, the headline
 * cap, the per-PC maths and the compare table's first two rows always match what an owner pays.
 * The feature split per plan is the owner's PROPOSAL on the prototype (Startups adds PDF reports by email + major
 * alerts by email; Teams adds performance + one person on two PCs; Businesses adds a year of history, priority
 * support, a setup call). Copy is keyed by plan code; an unknown code falls back to the API's own feature list.
 */

export interface PlanCopy {
  tag: string;
  /** [text, strong (a real addition), isNew (1.3)] */
  points: ReadonlyArray<readonly [string, boolean, boolean]>;
}

export const PLAN_COPY: Record<string, PlanCopy> = {
  free: {
    tag: "Try everything on your own office PCs.",
    points: [
      ["All six protections, with plain-English alerts", true, false],
      ["Chat and tasks with each person", true, false],
      ["Work hours with break approvals", true, false],
      ["Reports on screen, CSV download", true, false],
    ],
  },
  startups: {
    tag: "For small teams who want Zinwe to report to them.",
    points: [
      ["Everything in Free, on {pcs} PCs", false, false],
      ["A PDF report in your inbox, daily, weekly or monthly", true, true],
      ["Major alerts by email the moment they happen", true, true],
      ["{history} of history", true, false],
      ["Email support", true, false],
    ],
  },
  teams: {
    tag: "For offices of 11 to 25 who want to know who needs help.",
    points: [
      ["Everything in Startups, on {pcs} PCs", false, false],
      ["Performance: a fair score, a rank and next steps for each person", true, true],
      ["One person on two PCs, a laptop and a desktop", true, true],
      ["{history} of history", true, false],
      ["Email support", true, false],
    ],
  },
  businesses: {
    tag: "For growing companies up to 50 PCs that need records.",
    points: [
      ["Everything in Teams, on {pcs} PCs", false, false],
      ["A full year of history for audits and reviews", true, false],
      ["Priority support: we answer you first", true, false],
      ["A guided setup call for your whole team", true, false],
    ],
  },
};

export const PLANS_HERO = {
  eyebrow: "Plans",
  /** {cap} = less than the highest per-PC monthly price of any paid plan, from the catalogue. */
  title: "Protect every PC and run your team, from less than {cap} per PC a month.",
  lead: "Start free on 3 PCs. Move up when you want reports in your inbox, alerts by email or a score for every person. No card, no auto-charge.",
} as const;

export const PROMISES: ReadonlyArray<{ t: string; b: string; icon: string }> = [
  { t: "Free forever on 3 PCs", b: "Not a trial. No card.", icon: "M20 6 9 17l-5-5" },
  { t: "Nothing charged automatically", b: "You pay each period yourself.", icon: "M3 10h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" },
  { t: "Change or stop any time", b: "Your data stays with you.", icon: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" },
  { t: "A proper invoice", b: "GST invoice in India.", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" },
  {
    t: "Free setup call",
    b: "20 minutes with us.",
    icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  },
];

export const WHY: ReadonlyArray<{ plan: string; tone: string; pain: string; fix: string; how: string }> = [
  { plan: "Startups", tone: "tone-green", pain: "I don’t have time to open a dashboard every day.", fix: "The week arrives in your inbox.", how: "A PDF report on the day you choose, and an email the moment something big happens." },
  { plan: "Teams", tone: "tone-orange", pain: "I can’t tell who is stuck until it’s too late.", fix: "See who needs a hand, and what to do.", how: "A fair score from tasks, hours and focus, with two or three next steps for anyone falling behind." },
  { plan: "Businesses", tone: "tone-ink", pain: "Our clients and auditors ask for records.", fix: "A full year of history, ready to show.", how: "Twelve months of alerts and activity, priority support, and we set up your whole team with you." },
];

/** y = included, n = not included, anything else = the text shown. The first two rows are built from the API. */
export type Cell = "y" | "n" | string;
export type CompareRow = { group: string } | { f: string; isNew?: boolean; cells: readonly [Cell, Cell, Cell, Cell] };

export const COMPARE_ROWS: readonly CompareRow[] = [
  { group: "DATA PROTECTION" },
  { f: "Pen drive, file-copy and upload alerts", cells: ["y", "y", "y", "y"] },
  { f: "Remote-control apps and new software", cells: ["y", "y", "y", "y"] },
  { f: "Website blocking", cells: ["y", "y", "y", "y"] },
  { f: "Plain-English alerts in the dashboard", cells: ["y", "y", "y", "y"] },
  { f: "Major alerts by email, right away", isNew: true, cells: ["n", "y", "y", "y"] },
  { group: "YOUR TEAM" },
  { f: "Chat with each person", cells: ["y", "y", "y", "y"] },
  { f: "Tasks with steps, due dates and approvals", cells: ["y", "y", "y", "y"] },
  { f: "Work hours and break approvals", cells: ["y", "y", "y", "y"] },
  { f: "One person on two PCs", isNew: true, cells: ["n", "n", "y", "y"] },
  { group: "REPORTS" },
  { f: "Reports on screen and CSV", cells: ["y", "y", "y", "y"] },
  { f: "PDF reports emailed on a schedule", isNew: true, cells: ["n", "y", "y", "y"] },
  { f: "Performance: score, rank, next steps", isNew: true, cells: ["n", "n", "y", "y"] },
  { group: "SUPPORT" },
  { f: "Help", cells: ["Help pages", "Email", "Email", "Priority"] },
  { f: "Guided setup call for your team", cells: ["n", "n", "n", "y"] },
];

/** {first} = the first paid plan's PC limit, {top} / {topName} = the largest plan's. */
export const PLANS_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  { q: "Is GST included in the price?", a: "In India the price you see is before 18% GST; the card shows the total with GST too, and every payment gets a GST invoice. Outside India you pay in US dollars with no Indian GST." },
  { q: "Will I be charged automatically?", a: "No. Each payment covers one month or one year. We email you before it ends, and you pay for the next one only if you want to." },
  { q: "Can I change plans later?", a: "Yes, any time from Billing in your dashboard. Moving up starts right away; your rules, chats, tasks and history all stay." },
  { q: 'What does "Up to {first} PCs" mean?', a: "The number of Windows PCs with Zinwe connected. People are free: two people sharing one PC count once." },
  { q: "Which currency will I pay in?", a: "Pick it in the Currency menu above. Businesses in India pay in rupees by UPI, card or bank transfer. Everyone else pays in US dollars by card or bank transfer." },
  { q: "We have more than {top} PCs.", a: "{topName} covers up to {top} PCs. If you are growing past that, write to hello@zinwe.io and we will help you plan it." },
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
