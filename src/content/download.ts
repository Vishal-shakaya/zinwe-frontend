/**
 * The /download page: the Windows installer, what a PC needs, the four setup steps and the questions
 * people ask before installing. Copy rules as everywhere (.claude/marketing/marketing-context.md):
 * plain English, only what ships, consent first.
 */

/**
 * The installer, on this same site: nginx serves /download/ from the server's downloads folder
 * (`zinwe-server agent-file` publishes each build there). Relative, so dev serves dev's build.
 */
export const AGENT_MSI_URL = "/download/ZinweAgent.msi";
export const AGENT_MSI_NAME = "ZinweAgent.msi";

export const DOWNLOAD_NEEDS: readonly string[] = [
  "A Windows 10 or 11 PC (64-bit)",
  "Administrator permission on that PC, once, to install",
  "The person's work email and their Member ID from your dashboard",
  "An internet connection",
];

export const DOWNLOAD_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Add the person",
    body: "In your dashboard, open Team & devices and add their name and work email. They get an email with their Member ID and the download link.",
  },
  {
    title: "Install Zinwe on their PC",
    body: "Download the installer below on their PC and run it. Windows asks for administrator permission once. Nothing else to set up.",
  },
  {
    title: "Connect this PC",
    body: "The Zinwe widget opens by itself. Enter their work email and Member ID, then click Connect.",
  },
  {
    title: "They agree, protection starts",
    body: "The person reads what Zinwe shares with you and agrees on their own PC. It shows up in your dashboard within about a minute.",
  },
];

/** IT teams and remote installs: no clicks, no widget pop-up. */
export const SILENT_INSTALL = "msiexec /i ZinweAgent.msi MEMBER_EMAIL=asha@company.com MEMBER_ID=ZM-XXXX /qn";

export const DOWNLOAD_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Do I install anything on my own computer?",
    a: "No. Your dashboard runs in the browser at zinwe.io. You only install Zinwe on the PCs you want to protect — including your own, if you want it covered too.",
  },
  {
    q: "Will my team know Zinwe is on their PC?",
    a: "Yes, always. The Zinwe widget sits on their screen, and nothing is recorded until they agree on their own PC. Zinwe never records keystrokes, screens, or what's inside files, emails or messages.",
  },
  {
    // Remove once the purchased code-signing certificate ships (a launch blocker, 2026-10-17).
    q: "Windows warns me about the installer. Is that normal?",
    a: "For now, yes. Our publisher certificate is still being issued, so Windows may show \"Unknown publisher\". Check the file came from zinwe.io, then choose Yes (or More info → Run anyway). Questions? Write to hello@zinwe.io.",
  },
  {
    q: "How do updates work?",
    a: "When we release a new version, the Zinwe widget shows an Update button. One click and it installs itself — no need to download anything again.",
  },
  {
    q: "What if the PC goes offline?",
    a: "Protection keeps working with the last rules it received. Alerts and messages catch up as soon as the PC is back online.",
  },
  {
    q: "Is there a Mac or Linux version?",
    a: "Not yet. Windows is available today; Linux and macOS are on our roadmap, and we'll announce them on the Zinwe blog.",
  },
];
