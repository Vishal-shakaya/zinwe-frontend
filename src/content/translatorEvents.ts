/** A run of alert copy: plain text, or a highlighted (orange) word. */
export type MessagePart = string | { strong: string };

export interface TranslatorEvent {
  /** Log level, rendered dimmed (`.k`) once the line has finished typing. */
  level: string;
  /** Rest of the raw log line, typed out after the level. */
  raw: string;
  /** Plain-language alert shown on the card. */
  msg: MessagePart[];
  meta: string;
  /** Suggested actions; the first one is highlighted. */
  actions: [string, string];
}

/**
 * Raw event → plain-English alert pairs for the hero "translator". The raw lines use the Windows
 * agent's real event names, and each alert and action is something Zinwe does today.
 */
export const translatorEvents: TranslatorEvent[] = [
  {
    level: "[WARN]",
    raw: ' data.usb_copy drive=E: label="SanDisk Ultra" files=312 bytes=2254857830 pc=ACCOUNTS-PC-01',
    msg: [{ strong: "Priya" }, " copied 2.1 GB to a USB drive on the Accounts PC."],
    meta: "Accounts · ACCOUNTS-PC-01 · just now",
    actions: ["Block USB drives", "That's fine"],
  },
  {
    level: "[WARN]",
    raw: " remote.tool_detected tool=AnyDesk exe=AnyDesk.exe pid=7712 pc=DESK-07",
    msg: [{ strong: "AnyDesk" }, " is running on Rahul's PC. Someone may be controlling it."],
    meta: "Sales · DESK-07 · 2 min ago",
    actions: ["Block AnyDesk", "It's our IT vendor"],
  },
  {
    level: "[INFO]",
    raw: ' software.installed name="TeamViewer 15" publisher="TeamViewer" pc=DESIGN-PC-03',
    msg: [{ strong: "Amit" }, " installed TeamViewer, a remote-access app."],
    meta: "Design · DESIGN-PC-03 · 5 min ago",
    actions: ["Block it", "That's fine"],
  },
  {
    level: "[ALERT]",
    raw: " web.blocked_attempt domain=free-casino-bonus.example category=gambling pc=FRONT-DESK",
    msg: ["Zinwe blocked a ", { strong: "gambling site" }, " on the front-desk PC."],
    meta: "Reception · FRONT-DESK · 9 min ago",
    actions: ["Keep it blocked", "Allow this site"],
  },
];

/** Background chatter under the typed line (decorative, aria-hidden). */
export const translatorNoise: string[] = [
  "[INFO] heartbeat ok device=12 next=60s",
  "[INFO] usb.connected drive=F: label=Kingston",
  "[INFO] policy.updated v31 applied to 12 PCs",
];
