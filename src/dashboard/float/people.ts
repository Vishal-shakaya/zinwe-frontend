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
  developer: ["#F5F5F5", "#404040"],
  designer: ["#F5F5F5", "#404040"],
  sales: ["#FDEBDC", "#8A3A04"],
  support: ["#F5F5F5", "#404040"],
  accounts: ["#FDEBDC", "#8A3A04"],
  operations: ["#F5F5F5", "#404040"],
  management: ["#F5F5F5", "#404040"],
  other: ["#F5F5F5", "#6B6B6B"],
};

/** Board DOT: green working, amber on break, grey otherwise. */
const DOT: Record<PresenceStatus, string> = {
  working: "#17663F",
  break: "#A84505",
  online: "#8A8A8A",
  offline: "#8A8A8A",
  waiting: "#8A8A8A",
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
