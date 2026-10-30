/**
 * Free resources (/blog/guides, /blog/guides/:slug): the copy around the guides. The guides themselves (titles,
 * chapters, page counts, covers) come from the guides API, so this file holds only what the pages say about them.
 * Node-safe: build/staticPages.ts reads it for the pre-rendered page.
 */

/** The only "price" the library shows. No strike-through prices, no countdowns. */
export const FREE_LABEL = "Free · 2026";

/** Who wrote the guides (true: the Zinwe team made all four). */
export const GUIDE_AUTHOR = "Written by the Zinwe team";

/** What every guide in the library has. Checked against all four guides (22 Oct 2026). */
export const GUIDE_PROMISES: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: "Written for owners, not IT teams",
    text: "Plain English and short chapters, for busy owners with no IT department. No jargon, no scare statistics.",
  },
  {
    title: "Pages you actually use",
    text: "Printable checklists and workbook pages you fill in with your team, not just read once.",
  },
  {
    title: "A plan you can finish",
    text: "Each guide ends with a short plan: 30 days, or 7 for the team communication reset.",
  },
];

/** How the free membership works, in the order it happens (the GuideGate flow). */
export const FREE_STEPS: ReadonlyArray<{ title: string; text: string }> = [
  { title: "Enter your email", text: "On the guide's page. No card, no trial, nothing to install." },
  { title: "Confirm it", text: "We send one email. Click the link in it to confirm." },
  { title: "The PDF downloads", text: "Straight away. Keep it, print the workbook pages, share it with your team." },
];

export const FREE_TITLE = "How free works";

/** The honesty line: what the email actually signs you up for. */
export const FREE_HONESTY =
  "Free means free. Your email gets you a free Zinwe membership: every guide, plus our members-only story series by email. Unsubscribe any time, and the guides you have stay yours.";

export const GUIDE_NOTE = "General educational guidance, not legal or professional advice. Adapt it to your business.";
