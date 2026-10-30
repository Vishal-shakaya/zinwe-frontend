/**
 * Product page copy and sample data (board SiteFeatures, 29 Oct 2026), word for word. Sample people are the demo
 * company (Kitecrest Digital). One departure (rule 5, .claude/marketing/context.md §3; owner to confirm): the
 * "Fair by design" lead drops the board's last sentence naming India's DPDP Act and US notice rules.
 * Plan tags follow what each plan really includes (GET /api/auth/plans/): PDF and emailed reports are "Startups and up".
 * Rule "only shipped features": no Performance in Reports and no "major alerts by email" until those backends ship.
 * Tasks came back in 1.3.1 (FR-20). See .claude/dev/docs/06-website-portal.md.
 */
import { ICONS } from "../../components/site/icons.ts";

export const PRODUCT_SECTIONS = ["chat", "tasks", "hours", "reports", "alerts", "protection", "privacy"] as const;

export const PRODUCT_HERO = {
  eyebrow: "Product",
  title: "One app to run a small office and keep its data safe.",
  lead: "Chat, tasks, work hours, reports, plain-English alerts and data protection for small teams on Windows. Each one is simple on its own, and better together.",
  jumps: [
    { label: "Chat", href: "#chat", dot: "blue" },
    { label: "Tasks", href: "#tasks", dot: "orange" },
    { label: "Work hours", href: "#hours", dot: "amber" },
    { label: "Reports", href: "#reports", dot: "green" },
    { label: "Alerts", href: "#alerts", dot: "red" },
    { label: "Data protection", href: "#protection", dot: "ink" },
    { label: "Fair by design", href: "#privacy", dot: "green" },
  ],
} as const;

export const CHAT = {
  pill: "Chat · all plans",
  title: "Talk to anyone, right at their PC.",
  lead: "Work talk stays out of personal WhatsApp. Your message pops up in the Zinwe window on their screen within seconds.",
  points: [
    "One chat per person, with Sent, Delivered and Seen ticks",
    "Reply to a message with a quote, so nothing gets mixed up",
    "Turn any message into a task in one click",
    "Unread counts on your dashboard and on their taskbar icon",
  ],
  people: [
    { ini: "SR", name: "Sneha Reddy", last: "Got it, thank you!", on: true },
    { ini: "PN", name: "Priya Nair", last: "On it, calling them now.", on: false },
    { ini: "AM", name: "Arjun Mehta", last: "Deployed at 11:05.", on: false },
    { ini: "EC", name: "Emily Carter", last: "Back by 2!", on: false },
  ],
} as const;

export const TASKS = {
  pill: "Tasks · all plans",
  title: "Send a task. Watch it move.",
  lead: "Give work a due date and a few steps. Your person taps Start, asks for help if they're stuck, and marks it done. You approve it, or send it back.",
  points: [
    "A stage bar everyone understands: Sent, Seen, In progress, Done",
    "Steps inside a task, ticked off one by one",
    "Needs help brings the question straight to you",
    "Approve finished work, or reopen it with a note",
  ],
  steps: [
    { label: "Download the GSTR-2B for October", done: true },
    { label: "Match it with the purchase register", done: true },
    { label: "List the mismatches for the CA", done: false },
  ],
} as const;

export type Seg = readonly [number, number, "w" | "b"];
export const HOURS = {
  pill: "Work hours · all plans",
  title: "Attendance that runs itself.",
  lead: "No registers, no punch cards. Each person taps Start day, Take a break and End day on their own PC, with a reason when it matters.",
  points: [
    "Breaks over 45 minutes and early finishes ask for your OK",
    "Approve or say no in one tap; they see your answer at once",
    "Gentle reminders if someone forgets to start or end the day",
  ],
  strips: [
    { name: "Arjun", segs: [[32, 210, "w"], [210, 250, "b"], [250, 330, "w"]] as readonly Seg[], total: "5 h 48m" },
    { name: "Priya", segs: [[51, 200, "w"], [200, 235, "b"], [235, 330, "w"]] as readonly Seg[], total: "5 h 21m" },
    { name: "Emily", segs: [[20, 250, "w"], [250, 330, "b"]] as readonly Seg[], total: "4 h 02m" },
    { name: "Sneha", segs: [[60, 330, "w"]] as readonly Seg[], total: "4 h 30m" },
  ],
} as const;

export type PlanTag = "all" | "startups";
export const PLAN_TAG: Record<PlanTag, { label: string; tone: string }> = {
  all: { label: "All plans", tone: "tone-grey" },
  startups: { label: "Startups and up", tone: "tone-green" },
};

export const REPORTS = {
  pill: "Reports · all plans",
  title: "Reports that answer a question.",
  lead: "Who worked when, what got done, and where the time and data went. Pick a week or a person; every number adds up.",
  points: [
    { text: "Who worked when, day by day and hour by hour", tag: "all" as PlanTag },
    { text: "Apps, websites and internet data, per person", tag: "all" as PlanTag },
    { text: "PDF and CSV, emailed daily, weekly or monthly", tag: "startups" as PlanTag },
  ],
  kpis: [
    { l: "Worked in total", v: "301 h", s: "avg 7 h 10m a day" },
    { l: "Tasks done", v: "41", s: "of 49 sent" },
    { l: "Alerts", v: "9", s: "3 needed you" },
  ],
  /** Hours in the week, per person; bars are drawn against the longest week. */
  people: [
    { name: "Arjun Mehta", hours: "34 h", mins: 2050 },
    { name: "Priya Nair", hours: "33 h", mins: 1965 },
    { name: "Emily Carter", hours: "29 h", mins: 1760 },
    { name: "Sneha Reddy", hours: "27 h", mins: 1625 },
  ],
} as const;

export const ALERTS = {
  pill: "Alerts · all plans",
  title: "Plain English, not logs.",
  lead: "Zinwe turns what a PC records into a sentence you can act on: who, what, how big, and one button for what to do.",
  points: [
    { text: "Three levels: Needs you, Worth a look and Info", tag: "" },
    { text: "Ask the person or fix it from the alert itself", tag: "" },
  ],
  demos: {
    usb: {
      label: "Pen drive copy",
      raw: "[WARN] USBSTOR\\Disk&Ven_SanDisk&Prod_Cruzer_Blade write 1,932,735,283 bytes user=KC-SALES-LAPTOP-02\\karan",
      level: "Needs you",
      tone: "tone-red",
      title: "Karan copied 1.8 GB to a SanDisk pen drive at 11:20 AM.",
      body: "That is above your 500 MB limit for USB copies. Zinwe records the size and where it went, never what was in the files.",
      action: "Ask Karan",
      action2: "Make USB read-only",
    },
    remote: {
      label: "Remote-control app",
      raw: "Process start: UltraViewer_Desktop.exe (pid 8812) parent=explorer.exe session=1 host=KC-ACCOUNTS-01",
      level: "Needs you",
      tone: "tone-red",
      title: "UltraViewer opened on Priya’s accounts PC.",
      body: "It lets someone outside control the PC. Your rule blocks remote tools, so Zinwe closed it. Check whether someone called her asking to install it.",
      action: "Ask Priya",
      action2: "Mark as fine",
    },
    upload: {
      label: "Big upload",
      raw: "TLS 443 SNI=wetransfer.com tx_bytes=671088640 proc=chrome.exe host=KC-DESIGN-02",
      level: "Info",
      tone: "tone-blue",
      title: "Sneha uploaded 640 MB to WeTransfer.",
      body: "Only the site and the size are recorded. Large uploads from a design PC are often client files, so this is just for your information.",
      action: "Ask Sneha",
      action2: "Mark as fine",
    },
  },
} as const;
export type DemoKey = keyof typeof ALERTS.demos;

export const PROTECTION = {
  pill: "Data protection · all plans",
  title: "Data protection in six simple choices.",
  lead: "Data leaves a small office on pen drives, shared folders, email and uploads, and trouble gets in through remote-control apps, new software and risky sites. For each one, pick how strict to be. Every PC follows your answer within about a minute.",
  doors: [
    { title: "Pen drives", body: "See every copy to a USB drive with its size. Keyboards and mice are never affected.", icon: ICONS.usb, modes: ["Allow", "Open files only", "Block"] },
    { title: "Files leaving the office", body: "Big copies to shared folders and email attachments, with a size limit you set.", icon: ICONS.mail, modes: ["Watch", "Set a limit"] },
    { title: "Uploads to the web", body: "Which sites got the data and how much, from WeTransfer to Google Drive.", icon: ICONS.up, modes: ["Watch", "Set a limit"] },
    { title: "Remote-control apps", body: "AnyDesk, TeamViewer, UltraViewer: alert when one starts, close the ones you don’t use.", icon: ICONS.app, modes: ["Allow", "Only ours", "None"] },
    { title: "New software", body: "Every program installed on a PC, the day it appears, in plain words.", icon: ICONS.box, modes: ["Watch"] },
    { title: "Risky websites", body: "Block adult, gambling, malware and scam sites, or any site you choose.", icon: ICONS.web, modes: ["Just show me", "Block risky ones"] },
  ],
} as const;

export const PRIVACY = {
  pill: "Fair by design",
  title: "Nothing starts until they agree.",
  lead: "When Zinwe is installed, each person reads exactly what it records on their PC and chooses. You see who agreed, and when.",
  points: [
    "The Zinwe window always shows which rules are on",
    "Sizes, names and times, never contents",
    "Each person can say no; you see it on your Team page",
  ],
  recorded: ["Work start, breaks and end of day", "Apps and website names, and time on them", "Size and destination of file copies", "Remote-control apps and new software"],
  never: ["Keystrokes or screenshots", "Camera or microphone", "What is inside files and messages", "Full web addresses"],
} as const;

export const PRODUCT_CLOSE = {
  title: "Try it free, on 3 PCs.",
  body: "Chat, tasks, work hours, reports, alerts and data protection. No card, no time limit.",
} as const;
