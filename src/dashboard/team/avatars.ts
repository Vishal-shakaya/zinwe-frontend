/**
 * DashTeam: role colours (live product, FR-19) and the 7 drawn preset pictures for the avatar popover.
 * Initials on the role tint stay the fallback when a person has no picture.
 */
import type { MemberRole } from "../../lib/api";

export type AvatarKey = "kite" | "sun" | "hills" | "wave" | "leaf" | "moon" | "bolt" | "dots";

export interface AvatarArt {
  label: string;
  bg: string;
  /** [path, fill] pairs on a 40×40 box. */
  p: ReadonlyArray<readonly [string, string]>;
}

export const AVATARS: Record<AvatarKey, AvatarArt> = {
  kite: { label: "Kite", bg: "#FDEBDC", p: [["M20 6 30 18 20 34 10 18z", "#F26A0A"], ["M19 6h2v28h-2z", "#FDEBDC"]] },
  sun: { label: "Sun", bg: "#FBF0D9", p: [["M11 20a9 9 0 1 0 18 0a9 9 0 1 0-18 0z", "#E0A526"]] },
  hills: { label: "Hills", bg: "#E3F4EA", p: [["M2 34 14 18l8 10 5-6 11 12z", "#17663F"]] },
  wave: { label: "Wave", bg: "#E6EEFB", p: [["M2 24q6-7 12 0t12 0t12 0V40H2z", "#1B4FB0"]] },
  leaf: { label: "Leaf", bg: "#EEF4E4", p: [["M10 31C10 17 18 10 31 9c0 13-7 22-21 22z", "#3F6B1F"]] },
  moon: { label: "Moon", bg: "#F4ECFB", p: [["M24 9a11 11 0 1 0 8 18A9 9 0 0 1 24 9z", "#6B3FA0"]] },
  bolt: { label: "Bolt", bg: "#141210", p: [["M22 6 11 22h8l-2 12 12-17h-8z", "#F26A0A"]] },
  dots: {
    label: "Dots",
    bg: "#EFECE5",
    p: [["M10 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM24 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM10 27a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM24 27a3 3 0 1 0 6 0a3 3 0 1 0-6 0z", "#4A443C"]],
  },
};

/** The 8 choices in the popover: initials first, then these 7 drawn ones. */
export const PRESET_KEYS: readonly AvatarKey[] = ["kite", "sun", "hills", "wave", "leaf", "moon", "bolt"];

/** [top border, avatar tint, avatar ink] per role. */
export const ROLE_COLORS: Record<MemberRole, readonly [string, string, string]> = {
  developer: ["#2F6FDF", "#E6EFFD", "#1D4FA8"],
  designer: ["#D0458F", "#FBE8F2", "#9C2867"],
  sales: ["#1F9D61", "#E3F6EC", "#136C42"],
  support: ["#158F96", "#E0F5F6", "#0D666B"],
  accounts: ["#C98A12", "#FBF1DC", "#8A5D06"],
  operations: ["#5B6475", "#ECEEF2", "#3C4352"],
  management: ["#7A4AD8", "#EFE8FC", "#5530A3"],
  other: ["#8A8A83", "#EFEFEB", "#55554F"],
};

export function roleColors(role: MemberRole | "" | undefined): readonly [string, string, string] {
  return role ? ROLE_COLORS[role] : ROLE_COLORS.other;
}

export function isAvatarKey(key: string): key is AvatarKey {
  return key in AVATARS;
}
