/**
 * Sample data for the live dashboard window in the Home hero (board SitePortal). It is a demo company —
 * Kitecrest Digital, Wed 28 Oct 2026, the same sample as the dashboard prototype (page 2) — never a real customer.
 * Nothing clicked in the window leaves the browser. Copy is word for word from the board.
 */
import { ICONS } from "../../components/site/icons";

export type DemoTab = "overview" | "chat" | "tasks" | "reports" | "alerts";
export type Tone = "green" | "blue" | "amber" | "red" | "orange" | "purple" | "grey" | "stone";

export const TAB_ORDER: readonly DemoTab[] = ["overview", "chat", "tasks", "reports", "alerts"];
export const TAB_LABEL: Record<DemoTab, string> = {
  overview: "Overview",
  chat: "Chat",
  tasks: "Tasks",
  reports: "Reports",
  alerts: "Alerts",
};
export const TAB_ICON: Record<DemoTab, string> = {
  overview: ICONS.overview,
  chat: ICONS.chat,
  tasks: ICONS.tasks,
  reports: ICONS.reports,
  alerts: ICONS.alerts,
};
export const TAB_ROUTE: Record<DemoTab, string> = {
  overview: "",
  chat: "chat/priya",
  tasks: "tasks",
  reports: "reports",
  alerts: "alerts",
};

/** Avatar tints per person (initials). */
export const PERSON_TONE: Record<string, Tone> = { PN: "blue", AM: "orange", SR: "green", KM: "amber", EC: "purple", OM: "grey" };

export const STAGES = ["Sent", "Seen", "In progress", "Done"] as const;

export type TaskStage = "sent" | "progress" | "review" | "done";
export interface DemoTask {
  id: number;
  title: string;
  ini: string;
  due: string;
  stage: TaskStage;
  steps?: string;
  late?: boolean;
}
export const TASKS0: readonly DemoTask[] = [
  { id: 1, title: "Chase Sharma Traders for 2 missing invoices", ini: "PN", due: "Today", stage: "progress" },
  { id: 2, title: "Ship the client-portal login fix", ini: "AM", due: "Today, 12 PM", stage: "review", steps: "3/3" },
  { id: 3, title: "Update the Brightway project timeline", ini: "EC", due: "Today, 12 PM", stage: "review" },
  { id: 4, title: "Export the brand screens for review", ini: "SR", due: "Today, 6:30 PM", stage: "progress", steps: "1/3" },
  { id: 5, title: "Call back Sunline Cafe", ini: "KM", due: "Overdue", stage: "sent", late: true },
  { id: 6, title: "Retest checkout on Safari", ini: "OM", due: "Tomorrow", stage: "sent" },
  { id: 7, title: "Smoke test the 2.4 release", ini: "OM", due: "Today", stage: "done", steps: "3/3" },
];
export const TASK_COLUMNS: ReadonlyArray<[TaskStage, string]> = [
  ["sent", "To start"],
  ["progress", "In progress"],
  ["review", "Waiting for your OK"],
  ["done", "Done"],
];

export type DemoMessage =
  | { id: number; kind: "text"; me: boolean; text: string; time: string; receipt?: string }
  | { id: number; kind: "task"; text: string; due: string; stage: number };
export const MSGS0: readonly DemoMessage[] = [
  { id: 1, kind: "text", me: false, text: "Sharma Traders sent only 3 of the 5 invoices.", time: "1:52 PM" },
  { id: 2, kind: "text", me: true, text: "Thanks Priya. Here is a task so we don’t lose it.", time: "1:54 PM", receipt: "Seen" },
  { id: 3, kind: "task", text: "Chase Sharma Traders for 2 missing invoices", due: "Today", stage: 2 },
  { id: 4, kind: "text", me: false, text: "On it, calling them now.", time: "1:58 PM" },
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
  { id: "n3", icon: ICONS.tasks, tone: "green", title: "Arjun finished the login fix", meta: "Task · waiting for your OK", btn: "Approve", done: "Approved" },
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
export const PERFORMANCE: ReadonlyArray<{ ini: string; name: string; score: number }> = [
  { ini: "AM", name: "Arjun Mehta", score: 92 },
  { ini: "PN", name: "Priya Nair", score: 88 },
  { ini: "EC", name: "Emily Carter", score: 81 },
  { ini: "SR", name: "Sneha Reddy", score: 64 },
];

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
