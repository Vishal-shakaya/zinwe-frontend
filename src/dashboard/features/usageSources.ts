/**
 * Friendly names for internet data used (FR-04): the agent reports apps by process ("whatsapp", "msedge") and
 * websites by domain ("googlevideo.com"); owners read "WhatsApp", "Microsoft Edge", "YouTube". Rows that map to
 * the same name are merged (youtube.com + googlevideo.com + ytimg.com → YouTube). Unknown keys keep their own name.
 */
import type { MetricTopItem } from "../../lib/api";

/** Website domain (or any parent of it) → the service it belongs to. */
const SITE_SOURCES: Record<string, string> = {
  "chatgpt.com": "ChatGPT",
  "openai.com": "ChatGPT",
  "oaiusercontent.com": "ChatGPT",
  "oaistatic.com": "ChatGPT",
  "claude.ai": "Claude",
  "anthropic.com": "Claude",
  "gemini.google.com": "Gemini",
  "perplexity.ai": "Perplexity",
  "whatsapp.com": "WhatsApp",
  "whatsapp.net": "WhatsApp",
  "youtube.com": "YouTube",
  "googlevideo.com": "YouTube",
  "ytimg.com": "YouTube",
  "youtu.be": "YouTube",
  "instagram.com": "Instagram",
  "cdninstagram.com": "Instagram",
  "facebook.com": "Facebook",
  "fbcdn.net": "Facebook",
  "facebook.net": "Facebook",
  "x.com": "X (Twitter)",
  "twitter.com": "X (Twitter)",
  "twimg.com": "X (Twitter)",
  "linkedin.com": "LinkedIn",
  "licdn.com": "LinkedIn",
  "netflix.com": "Netflix",
  "nflxvideo.net": "Netflix",
  "primevideo.com": "Prime Video",
  "hotstar.com": "JioHotstar",
  "jiocinema.com": "JioHotstar",
  "spotify.com": "Spotify",
  "scdn.co": "Spotify",
  "gaana.com": "Gaana",
  "telegram.org": "Telegram",
  "zoom.us": "Zoom",
  "slack.com": "Slack",
  "dropbox.com": "Dropbox",
  "wetransfer.com": "WeTransfer",
  "drive.google.com": "Google Drive",
  "googleusercontent.com": "Google Drive",
  "mail.google.com": "Gmail",
  "google.com": "Google",
  "gstatic.com": "Google",
  "googleapis.com": "Google",
  "office.com": "Microsoft 365",
  "office.net": "Microsoft 365",
  "microsoftonline.com": "Microsoft 365",
  "sharepoint.com": "OneDrive / SharePoint",
  "onedrive.com": "OneDrive / SharePoint",
  "live.com": "Outlook",
  "outlook.com": "Outlook",
  "windowsupdate.com": "Windows Update",
  "microsoft.com": "Microsoft",
  "amazon.in": "Amazon",
  "amazon.com": "Amazon",
  "flipkart.com": "Flipkart",
  "zinwe.io": "Zinwe",
};

/** Process name (lowercase, no .exe) → app name. */
const APP_SOURCES: Record<string, string> = {
  whatsapp: "WhatsApp",
  "whatsapp.root": "WhatsApp",
  chrome: "Google Chrome",
  msedge: "Microsoft Edge",
  msedgewebview2: "Microsoft Edge (in apps)",
  firefox: "Firefox",
  brave: "Brave",
  opera: "Opera",
  chatgpt: "ChatGPT",
  claude: "Claude",
  "ms-teams": "Microsoft Teams",
  teams: "Microsoft Teams",
  zoom: "Zoom",
  slack: "Slack",
  telegram: "Telegram",
  olk: "Outlook",
  outlook: "Outlook",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  spotify: "Spotify",
  anydesk: "AnyDesk",
  teamviewer: "TeamViewer",
  code: "Visual Studio Code",
  winword: "Microsoft Word",
  excel: "Microsoft Excel",
  powerpnt: "Microsoft PowerPoint",
  onenote: "Microsoft OneNote",
  ultraviewer_desktop: "UltraViewer",
  windowsterminal: "Windows Terminal",
  notepad: "Notepad",
  figma: "Figma",
  photoshop: "Adobe Photoshop",
  acrord32: "Adobe Acrobat",
  acrobat: "Adobe Acrobat",
  tally: "TallyPrime",
  tallyprime: "TallyPrime",
  explorer: "File Explorer",
  svchost: "Windows (system services)",
  system: "Windows",
  "zinwe.agent.service": "Zinwe",
  "zinwe.agent.tray": "Zinwe",
};

/** "rr3.googlevideo.com" → "YouTube": the domain or its nearest listed parent. */
export function siteSource(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (SITE_SOURCES[candidate]) return SITE_SOURCES[candidate];
  }
  return domain;
}

export function appSource(process: string): string {
  return APP_SOURCES[process.toLowerCase()] ?? process;
}

/** Merge rows that share a friendly name, biggest data first. */
export function mergeBySource(items: readonly MetricTopItem[], nameOf: (key: string) => string, limit = 10): MetricTopItem[] {
  const merged = new Map<string, MetricTopItem>();
  for (const item of items) {
    const key = nameOf(item.key);
    const row = merged.get(key) ?? { key, count: 0, bytes: 0, seconds: 0 };
    row.count += item.count;
    row.bytes += item.bytes;
    row.seconds += item.seconds;
    merged.set(key, row);
  }
  return [...merged.values()].sort((a, b) => b.bytes - a.bytes || a.key.localeCompare(b.key)).slice(0, limit);
}

/** What kind of site a service is (DashOnline's Category column). Unknown services read "Other". */
const SITE_CATEGORY: Record<string, string> = {
  Google: "Search",
  Gmail: "Email",
  Outlook: "Email",
  "Microsoft 365": "Work tools",
  "OneDrive / SharePoint": "File sharing",
  "Google Drive": "File sharing",
  Dropbox: "File sharing",
  WeTransfer: "File sharing",
  ChatGPT: "AI tools",
  Claude: "AI tools",
  Gemini: "AI tools",
  Perplexity: "AI tools",
  WhatsApp: "Messaging",
  Telegram: "Messaging",
  Slack: "Messaging",
  Zoom: "Meetings",
  YouTube: "Video",
  Netflix: "Video",
  "Prime Video": "Video",
  JioHotstar: "Video",
  Spotify: "Music",
  Gaana: "Music",
  Instagram: "Social",
  Facebook: "Social",
  "X (Twitter)": "Social",
  LinkedIn: "Social",
  Amazon: "Shopping",
  Flipkart: "Shopping",
  "Windows Update": "System",
  Microsoft: "Work tools",
  Zinwe: "Work tools",
};

const DOMAIN_CATEGORY: Record<string, string> = {
  "github.com": "Work tools",
  "gitlab.com": "Work tools",
  "stackoverflow.com": "Work tools",
  "figma.com": "Work tools",
  "notion.so": "Work tools",
  "docs.google.com": "Work tools",
  "canva.com": "Work tools",
  "localhost": "Work tools",
  "bing.com": "Search",
  "duckduckgo.com": "Search",
};

/** "YouTube" → "Video"; falls back to the domain, then "Other". */
export function siteCategory(name: string, domain = ""): string {
  if (DOMAIN_CATEGORY[domain]) return DOMAIN_CATEGORY[domain];
  return SITE_CATEGORY[name] ?? "Other";
}

/** A website (or the service it belongs to): the friendly name, its busiest domain, time and data. */
export interface SiteRow {
  name: string;
  domain: string;
  seconds: number;
  bytes: number;
}

/**
 * Time rows (web.domain, seconds) and data rows (web.data.site, bytes) joined by friendly name. The time row's
 * `count` is foreground samples, not visits, so it's never used (FIX-014). Most time first.
 */
export function siteRows(time: readonly MetricTopItem[], data: readonly MetricTopItem[]): SiteRow[] {
  const rows = new Map<string, SiteRow & { best: number }>();
  const row = (domain: string) => {
    const name = siteSource(domain);
    const r = rows.get(name) ?? { name, domain, seconds: 0, bytes: 0, best: -1 };
    rows.set(name, r);
    return r;
  };
  for (const i of time) {
    const r = row(i.key);
    r.seconds += i.seconds;
    if (i.seconds > r.best) {
      r.best = i.seconds;
      r.domain = i.key;
    }
  }
  for (const i of data) row(i.key).bytes += i.bytes;
  return [...rows.values()]
    .map(({ best: _best, ...r }) => r)
    .sort((a, b) => b.seconds - a.seconds || b.bytes - a.bytes || a.name.localeCompare(b.name));
}

/** Browsers and Windows/Zinwe itself: left out of "apps" lists (a browser's time is its websites). */
const NOT_AN_APP = new Set([
  "chrome",
  "msedge",
  "firefox",
  "brave",
  "opera",
  "opera_gx",
  "vivaldi",
  "chromium",
  "arc",
  "explorer",
  "searchhost",
  "shellexperiencehost",
  "startmenuexperiencehost",
  "lockapp",
  "applicationframehost",
  "svchost",
  "system",
  "zinwe.agent.service",
  "zinwe.agent.tray",
  "zinwe",
]);

export function isBrowser(process: string): boolean {
  return ["chrome", "msedge", "firefox", "brave", "opera", "opera_gx", "vivaldi", "chromium", "arc"].includes(process.toLowerCase());
}

/** Apps worth listing: not Windows itself, not Zinwe (and, when `noBrowsers`, not a browser). */
export function isCountedApp(process: string, noBrowsers: boolean): boolean {
  const p = process.toLowerCase();
  if (!noBrowsers && isBrowser(p)) return true;
  return !NOT_AN_APP.has(p) && !p.startsWith("zinwe");
}

/** What kind of app it is (DashApps' Top 5 second line), by friendly name. */
const APP_KIND: Record<string, string> = {
  "Google Chrome": "Browser",
  "Microsoft Edge": "Browser",
  Firefox: "Browser",
  Brave: "Browser",
  Opera: "Browser",
  Outlook: "Email",
  "Visual Studio Code": "Code editor",
  "Windows Terminal": "Command line",
  "Microsoft Word": "Documents",
  "Microsoft Excel": "Spreadsheets",
  "Microsoft PowerPoint": "Presentations",
  "Microsoft OneNote": "Notes",
  Notepad: "Notes",
  "Microsoft Teams": "Meetings",
  Zoom: "Meetings",
  Slack: "Messaging",
  WhatsApp: "Messaging",
  Telegram: "Messaging",
  Figma: "Design",
  "Adobe Photoshop": "Design",
  "Adobe Acrobat": "Documents",
  TallyPrime: "Accounting",
  "File Explorer": "Files",
  UltraViewer: "Remote control",
  AnyDesk: "Remote control",
  TeamViewer: "Remote control",
  Spotify: "Music",
};

export function appKind(name: string): string {
  return APP_KIND[name] ?? "App";
}
