import type { Member } from "../../lib/api";

const DEFAULT_DOWNLOAD_URL = "https://zinwe.io/download";

/**
 * The plain-text invite the owner hands a team member so they can connect their
 * own PC: their email, their ID, and where to download Zinwe. This is the same
 * information the invite email carries, formatted to paste into any chat/SMS.
 */
export function buildInviteText(member: Member, companyName?: string | null): string {
  const firstName = member.name.trim().split(/\s+/)[0] || "there";
  const company = (companyName ?? "").trim();
  const download = member.download_url || DEFAULT_DOWNLOAD_URL;
  const openingLine = company
    ? `Hi ${firstName}, you've been added to Zinwe at ${company}.`
    : `Hi ${firstName}, you've been added to Zinwe.`;
  return [
    openingLine,
    "",
    "Install Zinwe on your PC, then connect it with:",
    `• Email: ${member.email}`,
    `• Your ID: ${member.member_id}`,
    "",
    `Download Zinwe: ${download}`,
    "",
    "You only need to do this once.",
  ].join("\n");
}
