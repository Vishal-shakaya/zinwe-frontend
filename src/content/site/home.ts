/**
 * Home v3.2 copy and sample data (board SiteHome, owner review 29 Oct 2026), word for word.
 * Sample people and companies are the demo company (Kitecrest Digital, Wed 28 Oct 2026), never real customers.
 *
 * Deliberate departures from the board, for the hard rules in .claude/marketing/context.md §3 (owner to confirm):
 * - the price question reads its numbers from the plans API (no price is typed here),
 * - the third "Consent first" card does not name a law (rule 5: no legal or compliance claims), and
 * - (29 Oct, rule "only shipped features") no tasks and no performance scores anywhere until their backends ship
 *   (FR-20 tasks, performance): the Tasks tile is gone, the Reports tile shows hours per person, and the team-side
 *   copy talks about messages. See .claude/dev/docs/06-website-portal.md to put them back.
 */
import { ICONS } from "../../components/site/icons";

export const HERO = {
  badge: "IT Is OK.",
  badgeText: "For offices of 5 to 50 people with no IT department",
  title: "Run a safe, organised office from one screen.",
  lead: "Zinwe protects company data on every Windows PC and gives you chat, work hours and reports in the same place. Simple enough to set up this afternoon.",
  ticks: ["No card needed", "Windows 10 and 11", "Each person agrees on their own PC"],
} as const;

export const TILES_INTRO = {
  eyebrow: "One app, the whole office",
  title: "Everything an owner needs. Nothing they don't.",
  lead: "Talk to your team, see the hours and keep data safe. Each part is one click from the others.",
} as const;

/** Day strips, 9 AM (0) to 7 PM (600 min): w = working, b = break. */
export type Seg = readonly [number, number, "w" | "b"];
export const HOUR_STRIPS: ReadonlyArray<{ name: string; segs: readonly Seg[] }> = [
  { name: "Arjun", segs: [[32, 210, "w"], [210, 250, "b"], [250, 330, "w"]] },
  { name: "Priya", segs: [[51, 200, "w"], [200, 235, "b"], [235, 330, "w"]] },
  { name: "Emily", segs: [[20, 250, "w"], [250, 330, "b"]] },
];

export const REPORT_HOURS: readonly number[] = [58, 61, 12, 0, 63, 66, 41];
/** Hours worked this week, per person (the Reports tile). Bars are drawn against the longest week. */
export const REPORT_PEOPLE: ReadonlyArray<{ name: string; hours: string; mins: number }> = [
  { name: "Arjun", hours: "34 h", mins: 2050 },
  { name: "Priya", hours: "33 h", mins: 1965 },
  { name: "Sneha", hours: "27 h", mins: 1625 },
];

export type RuleKey = "usb" | "app" | "web";
export type OutcomeTone = "ok" | "block" | "note";
export interface Rule {
  key: RuleKey;
  title: string;
  sub: string;
  icon: string;
  options: ReadonlyArray<readonly [string, string]>;
  out: Record<string, { tone: OutcomeTone; state: string; title: string; body: string }>;
  when: string;
  words: Record<string, string>;
}

/** Protection rules: what the owner picks, and what the PC then does. Tones: ok = green, block = red, note = blue. */
export const RULES: readonly Rule[] = [
  {
    key: "usb",
    title: "Pen drives",
    sub: "Keyboards and mice are never affected.",
    icon: ICONS.usb,
    options: [
      ["allow", "Allow"],
      ["readonly", "Open files only"],
      ["block", "Block"],
    ],
    out: {
      allow: { tone: "note", state: "Noted", title: "Pen drive works as usual", body: "Karan copied 1.8 GB. You see the size and the drive, never the files." },
      readonly: { tone: "block", state: "Read-only", title: "Files open, nothing copies out", body: "Karan can open files on the drive but can’t copy files onto it." },
      block: { tone: "block", state: "Blocked", title: "The pen drive doesn’t open", body: "Windows ignores the SanDisk drive. Karan sees why in his Zinwe window." },
    },
    when: "3:12 PM · SanDisk pen drive plugged in",
    words: { allow: "pen drives work and every copy is noted", readonly: "pen drives open files but can’t copy onto them", block: "pen drives don’t open" },
  },
  {
    key: "app",
    title: "Remote-control apps",
    sub: "AnyDesk, TeamViewer, UltraViewer.",
    icon: ICONS.app,
    options: [
      ["allow", "Allowed"],
      ["ours", "Only ours"],
      ["none", "None"],
    ],
    out: {
      allow: { tone: "note", state: "Noted", title: "AnyDesk opened", body: "Allowed by your rule. You get an alert with who and when." },
      ours: { tone: "block", state: "Closed", title: "UltraViewer closed in a second", body: "Only AnyDesk, the one your office uses, may run. You get an alert." },
      none: { tone: "block", state: "Closed", title: "Every remote-control app is closed", body: "Nobody outside can take over the PC. You get an alert for each try." },
    },
    when: "12:04 PM · a remote-control app starts",
    words: { allow: "remote apps are allowed and noted", ours: "only your own remote app may run", none: "every remote-control app is closed" },
  },
  {
    key: "web",
    title: "Websites",
    sub: "Adult, gambling, malware and scam sites.",
    icon: ICONS.web,
    options: [
      ["show", "Just show me"],
      ["block", "Block risky ones"],
    ],
    out: {
      show: { tone: "note", state: "Recorded", title: "Sites and time are recorded", body: "Nothing is blocked. You see which sites the team uses and for how long." },
      block: { tone: "block", state: "Blocked", title: "A gambling site was blocked", body: "The page doesn’t load. You can also block any site you choose." },
    },
    when: "4:40 PM · a risky website",
    words: { show: "websites are recorded, nothing blocked", block: "risky websites are blocked" },
  },
];
export const RULE_DEFAULTS: Record<RuleKey, string> = { usb: "readonly", app: "ours", web: "block" };

export const PROTECTION = {
  eyebrow: "Data protection",
  title: "Pen drives, apps and websites. Your rules, on every PC.",
  lead: "Pick an answer and every PC follows it within about a minute. No IT person, no policies to write. Try it.",
} as const;

export const TEAM_SIDE = {
  eyebrow: "For your team",
  title: "Your team gets a helpful app, not a hidden one.",
  lead: "The Zinwe window sits by the clock on each PC. Your people chat with you, start and end their day, and can always see exactly what Zinwe records.",
  points: [
    "Messages from you land right on their screen",
    "One tap to start the day, take a break or end the day",
    "A plain list of what is recorded, always one click away",
  ],
} as const;

export const STEPS: ReadonlyArray<string> = ["Create your free account", "Add your people", "Run the office from here"];

export const FAIR = {
  eyebrow: "Consent first",
  title: "Your team sees what's on. Not spyware.",
  lead: "Each person reads exactly what Zinwe records on their PC and chooses I agree or I don't agree. Nothing is recorded before they agree.",
  cards: [
    { t: "Visible on every PC", b: "The Zinwe window lists the rules that are on. Nothing runs hidden.", icon: ICONS.eye },
    { t: "Sizes and names, not contents", b: "A copy shows how big it was and where it went, never what was in it.", icon: ICONS.doc },
    // Board: "Built around the law" (names India's DPDP Act and US notice rules). Rule 5 keeps laws out of marketing
    // copy, so this card keeps only the board's own fact: who agreed, and when.
    { t: "A record of who agreed", b: "You see who agreed, and when, on your Team page.", icon: ICONS.shield },
  ],
  nevers: ["Keystrokes", "Screenshots", "Camera", "File contents", "Full web addresses", "Personal messages"],
} as const;

/**
 * "From an active member": a real client's words, shown only with their written permission (rule 7: never invent one).
 * null = the section is not shown. Fill in {quote, name, role, business} the day a client agrees.
 */
export const MEMBER_QUOTE: { quote: string; name: string; role: string; business: string } | null = null;

export const CLOSE = {
  title: "IT Is OK. Start free today.",
  body: "Three PCs, every feature you need to start, for as long as you like. Upgrade when you grow.",
} as const;
