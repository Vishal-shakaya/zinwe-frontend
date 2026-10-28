import type { Member } from "../../lib/api";

/** Where people download Zinwe, as shown and pasted ("zinwe.io/download" on the live site). */
export function downloadPage(): { href: string; label: string } {
  try {
    const { origin, host } = window.location;
    return { href: `${origin}/download`, label: `${host.replace(/^www\./, "")}/download` };
  } catch {
    return { href: "https://zinwe.io/download", label: "zinwe.io/download" };
  }
}

/**
 * "Send {First} this" (DashTeam, Copy all): the three setup steps as plain text, ready to paste into email,
 * WhatsApp or chat. The same information the invite email carries. The Zinwe app asks for the work email and the
 * Member ID together, so step 2 names both.
 */
export function buildInviteText(member: Pick<Member, "name" | "email" | "member_id">): string {
  const first = member.name.trim().split(/\s+/)[0] || "there";
  return [
    `Hi ${first}, here is how to set up Zinwe on your PC:`,
    `1. Download Zinwe: ${downloadPage().label}`,
    `2. Your work email: ${member.email} · Your Member ID: ${member.member_id}`,
    "3. Open Zinwe and agree on screen.",
  ].join("\n");
}
