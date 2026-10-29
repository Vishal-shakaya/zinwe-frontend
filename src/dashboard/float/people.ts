/** Avatars and status words for the floating chat (DashFloat: role tint, presence dot, "Working · KC-DEV-01"). */
import type { CSSProperties } from "react";
import type { Member, MemberRole } from "../../lib/api";
import { PRESENCE_LABEL, presenceOf, type PresenceStatus } from "../features/memberStatus";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Board TINT: avatar background + ink by what the person does (FR-19 role). */
const TINT: Record<MemberRole, readonly [string, string]> = {
  developer: ["#E6EFFD", "#1D4FA8"],
  designer: ["#FBE8F2", "#9C2867"],
  sales: ["#E3F6EC", "#136C42"],
  support: ["#FDEBDC", "#8A3A04"],
  accounts: ["#FBF1DC", "#8A5D06"],
  operations: ["#ECEEF2", "#3C4352"],
  management: ["#EFE8FC", "#5530A3"],
  other: ["#EFEFEB", "#55554F"],
};

/** Board DOT: green working, amber on break, grey otherwise. */
const DOT: Record<PresenceStatus, string> = {
  working: "#17663F",
  break: "#8A5300",
  online: "#8A8A83",
  offline: "#8A8A83",
  waiting: "#8A8A83",
};

export function avatarStyle(role: MemberRole | "" | undefined, size: number): CSSProperties {
  const [bg, ink] = (role && TINT[role]) || TINT.other;
  return { width: size, height: size, background: bg, color: ink };
}

/** For a MemberAvatar inside a tinted frame: the initials keep the frame's tint and type (FR-44). */
export const INHERIT_TINT: CSSProperties = { background: "inherit", color: "inherit", fontSize: "inherit" };

export function dotColor(status: PresenceStatus): string {
  return DOT[status];
}

/** "Working · KC-DEV-01" (board `p[3] + ' · ' + p[2]`). */
export function statusLine(member: Pick<Member, "device">): string {
  const status = presenceOf(member.device);
  return [PRESENCE_LABEL[status], member.device?.hostname].filter(Boolean).join(" · ");
}
