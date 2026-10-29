/**
 * SAMPLE (v1.3 board DashHelp, What's new): the release notes as drawn, used only while GET whats-new/ has none
 * published (a fresh local database). Real notes always win: publish them in the admin app (FR-21).
 * Same shape as the API (`ReleaseNote`): `summary` is the line beside the version, `body` is "- " bullets and
 * plain paragraphs.
 */
import { getReleaseNotes, type ReleaseNote } from "../../lib/api";
import { sample, SAMPLES_ON } from "./index";

export const SAMPLE_RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: -13,
    version: "1.3",
    title: "Tasks in chat, unread counts and sign-in with LinkedIn or Google",
    summary: "Your dashboard is on 1.3 now. The Windows app follows as 1.3.0.",
    published_at: "2026-10-29",
    body: [
      "- Tasks in chat: use Add task in anyone’s chat. It lands in their Zinwe app, and the Tasks page shows every stage.",
      "- Unread counts on Chat and the browser tab, and a dot on the bell, so you can see who is waiting for a reply.",
      "- Chat, version 2: date separators, reply to a message, and a link for each person’s chat (/app/chat/priya). A small bubble shows unread messages without covering the page.",
      "- Internet usage, a new page: time online and the sites used most, with a Data / Time switch on the chart.",
      "- Performance in Reports: each person’s inputs first, then the ranking. Only you see the ranking.",
      "- One person, two PCs: a second PC shows under the same person, so Vikram’s desktop and laptop sit together.",
      "- Sign up and log in with LinkedIn or Google. Zinwe only uses your name, work email and photo.",
      "",
      "Windows app 1.3.0 arrives as a required update. Until then your PCs keep running 1.2.1, and nothing changes for your team.",
    ].join("\n"),
  },
  {
    id: -12,
    version: "1.2",
    title: "Security, billing, email and work-time fixes",
    summary: "Windows app 1.2.1 on your PCs",
    published_at: "2026-10-25",
    body: [
      "- Pay monthly or yearly, with a new, simpler checkout.",
      "- Security fixes for sign-in and the dashboard.",
      "- Emails from Zinwe reach your inbox more reliably.",
      "- Work-time fixes: Start day, breaks and End day add up correctly in reports.",
    ].join("\n"),
  },
  {
    id: -11,
    version: "1.1",
    title: "Reports, browser notifications and safer UPI payments",
    summary: "",
    published_at: "2026-10-22",
    body: [
      "- Reports for a day, week or month: time worked, breaks, End day times and alerts, as a spreadsheet.",
      "- Browser notifications for replies, approvals and alerts.",
      "- Approve End day requests, just like breaks.",
      "- The full picture of internet use, now on Internet usage.",
      "- UPI QR codes made by the server with the exact amount filled in.",
    ].join("\n"),
  },
];

/** The published notes; the board's notes only while none are published (never in production: SAMPLES_ON). */
export async function loadReleaseNotes(signal?: AbortSignal): Promise<ReleaseNote[]> {
  const notes = await getReleaseNotes(signal);
  return notes.length > 0 || !SAMPLES_ON ? notes : sample([...SAMPLE_RELEASE_NOTES], signal);
}
