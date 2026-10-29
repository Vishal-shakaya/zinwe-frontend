/**
 * Sample data for the live dashboard window in the Home hero (board SitePortal). It is a demo company —
 * Kitecrest Digital, Wed 28 Oct 2026, the same sample as the dashboard prototype (page 2) — never a real customer.
 * Nothing clicked in the window leaves the browser. Copy is word for word from the board, except (29 Oct, rule
 * "only shipped features"): no Tasks page, no task cards in Chat and no Performance block in Reports until those
 * backends ship. Reports shows hours per person and the top apps instead. See .claude/dev/docs/06-website-portal.md.
 */
import { ICONS } from "../../components/site/icons";

export type DemoTab = "overview" | "chat" | "reports" | "alerts";
export type Tone = "green" | "blue" | "amber" | "red" | "orange" | "purple" | "grey" | "stone";

export const TAB_ORDER: readonly DemoTab[] = ["overview", "chat", "reports", "alerts"];
export const TAB_LABEL: Record<DemoTab, string> = {
  overview: "Overview",
  chat: "Chat",
  reports: "Reports",
  alerts: "Alerts",
};
export const TAB_ICON: Record<DemoTab, string> = {
  overview: ICONS.overview,
  chat: ICONS.chat,
  reports: ICONS.reports,
  alerts: ICONS.alerts,
};
export const TAB_ROUTE: Record<DemoTab, string> = {
  overview: "",
  chat: "chat/priya",
  reports: "reports",
  alerts: "alerts",
};

/** Avatar tints per person (initials). */
export const PERSON_TONE: Record<string, Tone> = { PN: "blue", AM: "orange", SR: "green", KM: "amber", EC: "purple", OM: "grey" };

export interface DemoMessage {
  id: number;
  me: boolean;
  text: string;
  time: string;
  receipt?: string;
}
export const MSGS0: readonly DemoMessage[] = [
  { id: 1, me: false, text: "Sharma Traders sent only 3 of the 5 invoices.", time: "1:52 PM" },
  { id: 2, me: true, text: "Thanks Priya. Can you chase them for the other 2 today?", time: "1:54 PM", receipt: "Seen" },
  { id: 3, me: false, text: "On it, calling them now.", time: "1:58 PM" },
];

export const OTHER_CHATS: ReadonlyArray<{ ini: string; name: string; last: string; unread: boolean }> = [
  { ini: "AM", name: "Arjun Mehta", last: "Deployed at 11:05. Both checked.", unread: true },
  { ini: "SR", name: "Sneha Reddy", last: "Can you give me edit access?", unread: true },
  { ini: "EC", name: "Emily Carter", last: "Back by 2!", unread: false },
];

export interface NeedItem {
  id: string;
  icon: string;
  tone: Tone;
  title: string;
  meta: string;
  btn: string;
  done: string;
}
export const NEEDS: readonly NeedItem[] = [
  { id: "n1", icon: ICONS.app, tone: "red", title: "UltraViewer opened on Priya’s PC", meta: "Closed by your rule · 12:04 PM", btn: "Ask Priya", done: "Asked" },
  { id: "n2", icon: ICONS.clock, tone: "amber", title: "Emily wants her lunch break approved", meta: "“Client lunch, back by 2” · 42 min", btn: "Approve", done: "Approved" },
  { id: "n3", icon: ICONS.chat, tone: "blue", title: "Sneha asked for edit access", meta: "Chat · “Can you give me edit access?”", btn: "Reply", done: "Replied" },
];

export const PEOPLE: ReadonlyArray<{ ini: string; name: string; status: string; tone: Tone; time: string }> = [
  { ini: "AM", name: "Arjun Mehta", status: "Working", tone: "green", time: "5 h 48m" },
  { ini: "PN", name: "Priya Nair", status: "Working", tone: "green", time: "5 h 21m" },
  { ini: "EC", name: "Emily Carter", status: "On a break", tone: "amber", time: "4 h 02m" },
  { ini: "SR", name: "Sneha Reddy", status: "Working", tone: "green", time: "4 h 40m" },
  { ini: "KM", name: "Karan Malhotra", status: "Not in yet", tone: "stone", time: "—" },
];

export const WEEK_HOURS: readonly number[] = [58, 61, 12, 0, 63, 66, 41];
export const WEEK_DAYS: readonly string[] = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
/** Hours worked in the 7 days, per person (Reports). Bars are drawn against the longest week. */
export const PERSON_HOURS: ReadonlyArray<{ ini: string; name: string; hours: string; mins: number }> = [
  { ini: "AM", name: "Arjun Mehta", hours: "34 h 10m", mins: 2050 },
  { ini: "PN", name: "Priya Nair", hours: "32 h 45m", mins: 1965 },
  { ini: "EC", name: "Emily Carter", hours: "29 h 20m", mins: 1760 },
  { ini: "SR", name: "Sneha Reddy", hours: "27 h 05m", mins: 1625 },
];
export const TOP_APPS = "Excel, Chrome and Tally Prime";

export interface DemoAlert {
  id: string;
  icon: string;
  title: string;
  body: string;
  level: string;
  tone: Tone;
  action: string;
}
export const ALERTS: readonly DemoAlert[] = [
  { id: "u", icon: ICONS.usb, title: "Karan copied 1.8 GB to a pen drive", body: "Above your 500 MB limit. Sizes only, never what was in the files.", level: "Needs you", tone: "red", action: "Ask Karan" },
  { id: "s", icon: ICONS.box, title: "uTorrent was installed on Olivia’s PC", body: "A file-sharing app that often brings unwanted software with it.", level: "Worth a look", tone: "amber", action: "Ask Olivia" },
  { id: "w", icon: ICONS.up, title: "Sneha uploaded 640 MB to WeTransfer", body: "Only the site and the size are recorded. Often client files.", level: "Info", tone: "blue", action: "Ask Sneha" },
];

export const RAW_LOG = "[WARN] USBSTOR\\Disk&Ven_SanDisk write 1,932,735,283 bytes user=KC-SALES-LAPTOP-02\\karan";

/** How long each page shows during the tour, in ms. */
export const TOUR_STEP_MS = 7000;
