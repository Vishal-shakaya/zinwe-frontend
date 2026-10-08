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

/** Raw log line -> plain-English alert pairs for the hero "translator". */
export const translatorEvents: TranslatorEvent[] = [
  {
    level: "[WARN]",
    raw: " 10.0.0.14 USB_MASS_STORAGE mount /dev/sdb1 uid=1043 bytes_out=2254857830 dir=\\\\FIN-SRV\\accounts",
    msg: [{ strong: "Priya" }, " copied 2.1 GB from the Accounts folder to a USB drive."],
    meta: "Finance · PC-14 · just now",
    actions: ["Block USB for Finance", "This is fine"],
  },
  {
    level: "[INFO]",
    raw: " rdp_inbound src=203.0.113.9 dst=DESK-07 auth=OK geo=?? session=00:41:10 tool=AnyDesk",
    msg: ["Someone from an ", { strong: "unknown location" }, " controlled Rahul's PC for 41 minutes."],
    meta: "Sales · DESK-07 · 2 min ago",
    actions: ["End the session", "It's our IT vendor"],
  },
  {
    level: "[WARN]",
    raw: " msiexec /i TeamViewer_Setup_x64.exe sig=UNVERIFIED user=amit@ elevated=1 exit=0",
    msg: [{ strong: "Amit" }, " installed a remote-access app that isn't on your approved list."],
    meta: "Design · PC-03 · 5 min ago",
    actions: ["Remove and block", "Approve this app"],
  },
  {
    level: "[ALERT]",
    raw: " smtp_out from=neha@ to=*@gmail.com attach=payroll_q3.xlsx size=4.8MB dlp=PII_MATCH",
    msg: ["A ", { strong: "payroll file" }, " was emailed to a personal Gmail address."],
    meta: "HR · PC-09 · 9 min ago",
    actions: ["Hold the email", "Allow it"],
  },
];

/** Background chatter under the typed line (decorative, aria-hidden). */
export const translatorNoise: string[] = [
  "[INFO] svc_watch heartbeat ok pid=4412 q=0",
  "[INFO] lan_scan 10.0.0.0/24 hosts=12 new=0",
  "[INFO] policy_sync v31 applied to 12 endpoints",
];
