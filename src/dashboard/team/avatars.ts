/**
 * DashTeam: role colours (FR-19) and the drawn avatar library (FR-44).
 *
 * The library is `avatars.json` — 16 calm, flat head-and-shoulders people on a 48 × 48 box. It is THE source of
 * truth: the Windows app embeds a byte-identical copy and the backend knows the keys (z_devices/pictures.py
 * AVATAR_KEYS). Keys never change; art and labels may. Paths use only M L H V C Q A Z and never overlap
 * themselves, so SVG (nonzero) and WPF (EvenOdd) draw them the same. `bg` fills the whole box: clip it to a circle.
 * Initials on the role tint stay the fallback when a person has no picture.
 */
import type { MemberRole } from "../../lib/api";
import library from "./avatars.json";

export interface AvatarArt {
  key: string;
  label: string;
  bg: string;
  /** [path, fill] pairs on the library's 48 × 48 box. */
  paths: ReadonlyArray<readonly [string, string]>;
}

export const AVATAR_VIEWBOX: string = library.viewBox;

export const AVATARS: readonly AvatarArt[] = library.avatars.map((a) => ({
  key: a.key,
  label: a.label,
  bg: a.bg,
  paths: a.paths.map(([d, fill]) => [d, fill] as const),
}));

const BY_KEY = new Map(AVATARS.map((a) => [a.key, a]));

/** The library avatar for a key, or undefined (an unknown key reads as initials). */
export function avatarArt(key: string): AvatarArt | undefined {
  return BY_KEY.get(key);
}

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
