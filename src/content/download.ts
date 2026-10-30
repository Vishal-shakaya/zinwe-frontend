/**
 * The /download page (board SiteDownload v3.1, 29 Oct 2026), word for word: the installer, two paths (an invited team
 * member / an owner setting up), the Windows warning, what a PC needs, IT mass install, the never-list and questions.
 * Copy rules as everywhere (.claude/marketing/context.md): plain English, only what ships, consent first.
 */

/**
 * The installer, on this same site: nginx serves /download/ from the server's downloads folder
 * (`zinwe-server agent-file` publishes each build there). Relative, so dev serves dev's build.
 */
export const AGENT_MSI_URL = "/download/ZinweAgent.msi";
export const AGENT_MSI_NAME = "ZinweAgent.msi";

/**
 * Release facts shown on the card. There is no public releases API yet (Admin › Releases is staff-only), so this is the
 * seam: the version is the window-app build (window-app <Version>), size and date are read live from the installer
 * (HEAD request). The SHA-256 block shows only when `sha256` is set here — never a made-up checksum. Update both with
 * each agent release, or replace this with a public endpoint (backend: Forge).
 */
export const AGENT_RELEASE: { version: string; sha256: string | null } = {
  version: "1.2.1",
  sha256: null,
};

export const DOWNLOAD_HERO = {
  eyebrow: "Download",
  title: "Download Zinwe for Windows.",
  lead: "One small app for each Windows 10 or 11 PC. It sits by the clock, protects company data, brings your team's chat and tasks, and records work hours with one tap.",
  facts: ["Free to download", "Installs in about a minute", "Each person agrees first", "No kernel driver"],
} as const;

export type StepMock = "download" | "connect" | "consent" | "tray" | "signup" | "add" | "install" | "online";
export type InstallPath = "member" | "owner";

export const PATHS: Record<InstallPath, ReadonlyArray<{ mock: StepMock; t: string; b: string }>> = {
  member: [
    { mock: "download", t: "Download and open the installer", b: "Use the orange button above. Windows asks for an administrator’s OK once; ask whoever looks after your PCs if you don’t have it." },
    { mock: "connect", t: "Type your email and Member ID", b: "Both are in the invite email from your company. Press Connect." },
    { mock: "consent", t: "Read what Zinwe records, then choose", b: "Nothing is recorded until you press I agree. You can read the list again any time." },
    { mock: "tray", t: "You’re in", b: "Zinwe sits by the clock: start your day, take breaks, chat with your manager and tick off tasks." },
  ],
  owner: [
    { mock: "signup", t: "Create your free account", b: "Sign up with Google, LinkedIn or email. No card needed." },
    { mock: "add", t: "Add each person", b: "On Team & PCs, type their name and work email. They get an invite with their Member ID." },
    { mock: "install", t: "Install on each PC", b: "They run the installer and connect, or your IT helper installs on every PC at once." },
    { mock: "online", t: "Watch the PCs come online", b: "Each PC appears in your dashboard as soon as its person agrees. Most offices finish in an afternoon." },
  ],
};

export const PATH_NOTE: Record<InstallPath, { note: string; link: string; to: string }> = {
  member: { note: "No invite yet? Ask the person who runs Zinwe at your company.", link: "Setting up for your office instead?", to: "/signup?plan=free" },
  owner: { note: "Want a hand with your first PCs?", link: "Book a free 20-minute setup call →", to: "/contact" },
};

export const WARN_INTRO = {
  eyebrow: "If Windows shows a warning",
  title: "It's expected. Three clicks get you past it.",
  body: "Zinwe is new, so Windows hasn't seen it on many PCs yet and says \"Unknown publisher\". If you downloaded it from zinwe.io, it's safe to continue.",
} as const;

/** {file} = the installer's file name. */
export const WARNS: ReadonlyArray<{ t: string; dlgTitle: string; dlgText: string; ok: string; cancel: string; b: string }> = [
  { t: "Keep the file", dlgTitle: "{file}", dlgText: "isn’t commonly downloaded. Make sure you trust it before you open it.", ok: "Keep", cancel: "Delete", b: "In Edge or Chrome, open the download’s menu and choose Keep." },
  { t: "More info, then Run anyway", dlgTitle: "Windows protected your PC", dlgText: "App: {file} · Publisher: Unknown publisher", ok: "Run anyway", cancel: "Don’t run", b: "Click More info, check the file name, then Run anyway." },
  { t: "Allow the install", dlgTitle: "User Account Control", dlgText: "Do you want to allow this app to make changes to your device?", ok: "Yes", cancel: "No", b: "Click Yes. The Zinwe window then opens above the taskbar." },
];

/** {size} = the installer's size (when known). */
export const REQUIREMENTS: ReadonlyArray<{ k: string; v: string }> = [
  { k: "Windows", v: "10 or 11, 64-bit" },
  { k: "Download", v: "{size}" },
  { k: "Permission", v: "An administrator’s OK, once" },
  { k: "Internet", v: "To connect; rules keep working offline" },
  { k: "Per person", v: "Work email and Member ID" },
];

/** IT teams and remote installs: no clicks, no window pop-up; the person still agrees on their own PC. */
export const SILENT_INSTALL = `msiexec /i ${AGENT_MSI_NAME} MEMBER_EMAIL=asha@company.com MEMBER_ID=ZM-XXXX-XXXX /qn`;

export const NEVERS: readonly string[] = [
  "Records keystrokes, screens, the camera or what is inside files and messages",
  "Installs a kernel driver: it is a standard Windows service",
  "Stops protecting when offline: it keeps its last rules",
  "Leaves a PC locked: uninstalling removes its USB rules",
];

export const DOWNLOAD_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  { q: "I lost my Member ID.", a: "Ask the person who invited you. It is on their Team & PCs page, and they can send the invite again with one click." },
  { q: "Will my team know Zinwe is on their PC?", a: "Yes. The Zinwe window opens after install, shows what it records and asks each person to agree. It then sits by the clock, bottom right." },
  { q: "Does it slow the PC down?", a: "It is built to stay light: a standard Windows service and a small window, with no kernel driver." },
  { q: "How do updates work?", a: "The Zinwe window shows Update now when a new version is ready. It takes about a minute and keeps the day’s work times." },
  { q: "What if the PC goes offline?", a: "Rules keep working with the last settings, and work times are saved on the PC until it reconnects." },
];

export const DOWNLOAD_CLOSE = {
  title: "Setting up for your office?",
  body: "Create a free account first, add your people, then install. Free forever on 3 PCs.",
} as const;
