/**
 * Active members (board SiteClients): the owner's client list, set in type — no real logos until each client agrees
 * to show theirs (.claude/marketing/context.md §3 rule 3). The owner supplied these names on the prototype (29 Oct
 * 2026); remove a name the day a client asks. There is no API for this list yet: this file is the seam.
 */
export const ACTIVE_MEMBERS: readonly string[] = [
  "Markone",
  "FeelSafe",
  "Hightech Window Blinds",
  "PK Elite",
  "LookLush",
  "EcoVision",
  "Dumbo Studio",
  "Nutraboat",
  "Vishal Interior",
  "Rudra Carpet",
  "NailMaster",
  "Studio Lush",
  "Interior Bazzar",
  "AR Singh",
  "Aquaform",
  "Red R Audio",
];

/** Monogram tints, the same soft set the dashboard uses for people (tone-* classes). */
export const MEMBER_TONES = ["orange", "blue", "green", "purple", "amber", "grey"] as const;

export function memberInitials(name: string): string {
  const parts = name.split(" ");
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
}

export const WALL_COPY = {
  title: "Small businesses that trust Zinwe.",
  body: "Interior studios, salons, audio shops, carpet makers and more: owners who wanted a calmer office without hiring IT.",
} as const;
