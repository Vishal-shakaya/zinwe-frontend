/**
 * Home v3.2 copy and sample data (board SiteHome, owner review 29 Oct 2026), word for word.
 * Sample people and companies are the demo company (Kitecrest Digital, Wed 28 Oct 2026), never real customers.
 *
 * Deliberate departures from the board, for the hard rules in .claude/marketing/context.md §3 (owner to confirm):
 * - the price question reads its numbers from the plans API (no price is typed here),
 * - the third "Consent first" card does not name a law (rule 5: no legal or compliance claims), and
 * - (rule "only shipped features") no performance scores until that backend ships: the Reports tile shows hours per
 *   person. Tasks came back in 1.3.1 with FR-20. See .claude/dev/docs/06-website-portal.md.
 */
import { ICONS } from "../../components/site/icons.ts";

export const HERO = {
  badge: "IT Is OK.",
  badgeText: "For offices of 5 to 50 people with no IT department",
  title: "Run a safe, organised office from one screen.",
  lead: "Zinwe protects your business data on every Windows PC, with no IT team needed, and gives you chat, tasks, work hours and reports in the same place. Simple enough to set up this afternoon.",
  leadPhone: "Protect your business data on every Windows PC and run your team's day from one place. No IT team needed.",
  ticks: ["No card needed", "Windows 10 and 11", "Each person agrees on their own PC"],
} as const;

/** v1.3.2 (owner, 31 Oct): the simple answer to "what does it do?", right after the client wall. Shipped features only (rule 4). */
export type WhatKey = "safe" | "day" | "talk";
export const WHAT = {
  eyebrow: "What Zinwe does",
  title: "Three jobs, one simple app.",
  jobs: [
    { key: "safe", t: "Keep company data safe", b: "Get a plain-English alert when files leave." },
    { key: "day", t: "Run the team's day", b: "See who started and who's on a break." },
    { key: "talk", t: "Talk to your team", b: "Send a message right to their PC." },
  ] satisfies ReadonlyArray<{ key: WhatKey; t: string; b: string }>,
} as const;

export const TILES_INTRO = {
  eyebrow: "One day with Zinwe",
  title: "Everything an owner needs. Nothing they don't.",
  lead: "Talk to your team, hand out work, see the hours and keep data safe. Each part is one click from the others.",
} as const;

/**
 * v1.3.2 (owner, 31 Oct): the features as an Apple-style card rail with faces from the team avatar library (FR-44).
 * Only shipped features (rule 4); facts as on the Product page (content/site/product.ts). `face` = avatars.json key.
 */
export type FeatureKey = "chat" | "tasks" | "reports" | "hours" | "alerts";
export interface Feature {
  key: FeatureKey;
  /** The moment in the owner's day. */
  time: string;
  kick: string;
  title: string;
  body: string;
  /** Product page anchor and its link text; null = no deeper page yet. */
  href: string | null;
  link: string;
}

/**
 * Each card's picture on a fixed 1200 × 900 canvas (public/media/home): a stock photo (Unsplash License) with one short
 * note from the Kitecrest demo data. Sample people only, never customers. Photos: Diogo Brandao (alerts), Ofspace (tasks),
 * Rodrigo Rodrigues (hours), litoon dev (chat), Vitaly Gariev (reports).
 */
export const FEATURE_SHOT = { width: 1200, height: 900 } as const;
/** One owner's day, in order. Each time and name comes from that card's screen (the Kitecrest demo account). */
export const FEATURES: readonly Feature[] = [
  { key: "alerts", time: "10:20 AM", kick: "Alerts", title: "Karan copied 1.7 GB.", body: "What happened, how big, and one button for what to do next.", href: "/product#alerts", link: "How alerts work" },
  { key: "tasks", time: "12:00 PM", kick: "Tasks", title: "Your OK, in one tap.", body: "Steps, a due date and a stage bar. Approve the work when it's done.", href: "/product#tasks", link: "How tasks work" },
  { key: "hours", time: "12:55 PM", kick: "Work hours", title: "Emily wants a lunch break.", body: "Start day, Take a break, End day. Long breaks ask for your OK.", href: "/product#hours", link: "How work hours work" },
  { key: "chat", time: "1:54 PM", kick: "Chat", title: "A quick word with Arjun.", body: "Messages pop up on their PC in seconds, with Seen ticks.", href: "/product#chat", link: "How chat works" },
  { key: "reports", time: "6:00 PM", kick: "Reports", title: "See your week in ten seconds.", body: "Hours, breaks and alerts, for everyone or one person.", href: "/product#reports", link: "What reports show" },
];

/** Sample people (the demo company, Kitecrest Digital) and the library picture each one wears on Home. */
/**
 * Stock portraits for the sample people on the website (public/people), Unsplash License, used as demo people only.
 * Never present them as real customers. Photos: IMANA (priya), Joecalih (emily), Skytech Aviation (sneha),
 * Yogendra Singh (arjun), Abhishek Rai (karan).
 */
export const FACE_PHOTOS: Readonly<Record<string, string>> = { a05: "priya", a10: "emily", a04: "sneha", a01: "arjun", a09: "karan" };

export const FACES = {
  you: "a12",
  priya: "a05",
  arjun: "a01",
  emily: "a10",
  sneha: "a04",
  karan: "a09",
  ravi: "a06",
  meera: "a07",
} as const;

export const CHAT_SPOT = {
  kick: "Chat",
  title: "Message anyone, right at their PC.",
  lead: "Keep work talk out of WhatsApp groups. Your message pops up on their screen within seconds, and any message can become a task.",
  link: "How chat works",
} as const;

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
  title: "Protect company data on every PC, no IT team needed.",
  lead: "Pick an answer once and every PC follows it within about a minute. Try it.",
  question: "When a pen drive is plugged in:",
  owner: "A plain-English alert",
} as const;

export const STEPS: ReadonlyArray<string> = ["Create your free account", "Add your people", "Run the office from here"];

/** The questions shown on Home; the rest of HOME_FAQ stays for the old page and search. */
export const HOME_FAQ_SHOWN: ReadonlyArray<string> = ["Is Zinwe spyware?", "Do I need an IT person to set it up?", "Can I use Zinwe just for chat and tasks?", "Does Zinwe work on Mac or Linux?", "How much does it cost?"];

/**
 * The review row: real words from business owners and their team members, shown only with each person's written
 * permission (rules 3 and 7: never invent one, never edit the meaning). Empty = the section is not on the live site.
 * Add one entry the day someone agrees.
 */
export type ReviewKind = "owner" | "member";
export interface Review {
  kind: ReviewKind;
  quote: string;
  name: string;
  role: string;
  business: string;
}
export const REVIEW_KINDS: Record<ReviewKind, string> = { owner: "Business owner", member: "Team member" };
export const REVIEWS_HEAD = { eyebrow: "Reviews", title: "From owners and their teams." } as const;
export const REVIEWS: readonly Review[] = [];

export const CLOSE = {
  title: "IT Is OK. Start free today.",
  body: "Data protection, chat, tasks, work hours and reports for your office, free forever on up to 3 PCs. Upgrade when you grow.",
} as const;
