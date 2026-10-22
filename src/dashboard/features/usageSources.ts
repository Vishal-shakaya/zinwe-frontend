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
