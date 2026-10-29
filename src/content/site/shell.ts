/**
 * Website v3 shell copy (boards SiteNav and SiteFooter, Zinwe Prototype v2.2, 29 Oct 2026), word for word.
 * Copy rules: .claude/marketing/context.md §3. The prototype's board links are mapped to real routes here.
 */

export interface NavLink {
  key: "product" | "plans" | "download" | "blog" | "contact";
  label: string;
  to: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { key: "product", label: "Product", to: "/product" },
  { key: "plans", label: "Plans", to: "/plans" },
  { key: "download", label: "Download", to: "/download" },
  { key: "blog", label: "Blog", to: "/blog" },
  { key: "contact", label: "Talk to us", to: "/contact" },
];

/**
 * The dark strip above the header, off for now. Only shipped features may be named (rule, 29 Oct): tasks,
 * performance and alerts by email are not built yet, so the text names the scheduled PDF reports (reports_pro).
 */
export const WHATS_NEW_BAR = {
  on: false,
  text: "Zinwe 1.3: PDF reports in your inbox, daily, weekly or monthly.",
  link: "See what's new →",
  to: "/product#reports",
} as const;

export interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

export const FOOTER_ABOUT =
  "Data safety, chat, work hours and reports for small teams on Windows. Made by SKYTECHNO in New Delhi.";

export const FOOTER_COLUMNS: ReadonlyArray<{ label: string; links: readonly FooterLink[]; note?: string }> = [
  {
    label: "PRODUCT",
    links: [
      { label: "Chat", to: "/product#chat" },
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
    label: "LEARN",
    links: [
      { label: "Blog", to: "/blog" },
      { label: "Free guides", to: "/blog/guides" },
      { label: "Members' series", to: "/blog/series" },
      { label: "Release notes", to: "/whats-new" },
    ],
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
