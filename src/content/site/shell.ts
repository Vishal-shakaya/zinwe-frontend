/**
 * Website v3 shell copy (boards SiteNav and SiteFooter, Zinwe Prototype v2.2, 29 Oct 2026), word for word.
 * Copy rules: .claude/marketing/context.md §3. The prototype's board links are mapped to real routes here.
 */

export interface NavLink {
  /** "resources" is the Resources menu (RESOURCE_LINKS), not a link. */
  key: "product" | "plans" | "download" | "resources" | "contact";
  label: string;
  to: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { key: "product", label: "Product", to: "/product" },
  { key: "plans", label: "Plans", to: "/plans" },
  { key: "download", label: "Download", to: "/download" },
  { key: "resources", label: "Resources", to: "/blog" },
  { key: "contact", label: "Talk to us", to: "/contact" },
];

/**
 * The four content pages (v1.3.2, owner 31 Oct): the header's Resources menu, the phone menu's Resources section and
 * the footer's RESOURCES column. Labels exactly as the owner named them.
 */
export type ResourceArtKey = "blog" | "newsletter" | "guides";
export interface ResourceLink {
  label: "Blog" | "Newsletter" | "Free resources" | "New release";
  to: string;
  sub: string;
  /** The drawing on its card in the header menu; no art = the strip along the bottom of the menu. */
  art?: ResourceArtKey;
}

export const RESOURCE_LINKS: readonly ResourceLink[] = [
  { label: "Blog", to: "/blog", sub: "Stories and how-tos for small offices", art: "blog" },
  { label: "Newsletter", to: "/blog/series", sub: "THE LAST FILE, a story in episodes", art: "newsletter" },
  { label: "Free resources", to: "/blog/guides", sub: "Practical guides for owners, free", art: "guides" },
  { label: "New release", to: "/whats-new", sub: "What's new in Zinwe" },
];

/**
 * The dark strip above the header, off for now. Only shipped features may be named (rule, 29 Oct): performance
 * and alerts by email are not built yet. Tasks (FR-20) come back in 1.3.1.
 */
export const WHATS_NEW_BAR = {
  on: false,
  text: "Zinwe 1.3: send tasks from chat, and PDF reports in your inbox.",
  link: "See what's new →",
  to: "/product#tasks",
} as const;

export interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

export const FOOTER_ABOUT =
  "Data protection, chat, tasks, work hours and reports for small teams on Windows. Made by SKYTECHNO in New Delhi.";

export const FOOTER_COLUMNS: ReadonlyArray<{ label: string; links: readonly FooterLink[]; note?: string }> = [
  {
    label: "PRODUCT",
    links: [
      { label: "Chat", to: "/product#chat" },
      { label: "Tasks", to: "/product#tasks" },
      { label: "Work hours", to: "/product#hours" },
      { label: "Reports", to: "/product#reports" },
      { label: "Data protection", to: "/product#protection" },
      { label: "Plans", to: "/plans" },
    ],
  },
  {
    label: "GET STARTED",
    links: [
      { label: "Create a free account", to: "/signup?plan=free" },
      { label: "Download for Windows", to: "/download" },
      { label: "Log in", to: "/login" },
      { label: "Book a setup call", to: "/contact" },
    ],
  },
  {
    label: "RESOURCES",
    links: RESOURCE_LINKS.map(({ label, to }) => ({ label, to })),
  },
  {
    label: "COMPANY",
    links: [
      { label: "Talk to us", to: "/contact" },
      { label: "hello@zinwe.io", href: "mailto:hello@zinwe.io" },
    ],
    note: "Mon–Sat, 10:00–19:00 IST",
  },
];

/** Footer legal links: each lands on its summary on /legal (anchors), the full texts link from there. */
export const FOOTER_LEGAL: readonly FooterLink[] = [
  { label: "Terms", to: "/legal#terms" },
  { label: "Privacy", to: "/legal#privacy" },
  { label: "Refunds", to: "/legal#refunds" },
  { label: "Cookies", to: "/legal#cookies" },
  { label: "Acceptable use", to: "/legal#aup" },
];

/**
 * The small note above the legal row, on every page: what Zinwe is for, and that its product screens are sample data
 * (replaces the "Sample data" labels on the pages, owner, 31 Oct). The client wall lists real clients, so it says
 * "product screens and examples". No law named, no promise made (rule 5).
 */
export const FOOTER_NOTE =
  "Zinwe is built to help owners protect their business and give every team member a calmer, clearer workday. The names, photos, companies and figures in our product screens and examples are sample data, shown only to explain how Zinwe works. They are not real customers, and your results may differ. Use of Zinwe is covered by our";
