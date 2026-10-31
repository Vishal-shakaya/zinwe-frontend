/**
 * Free resources (/blog/guides, /blog/guides/:slug): the copy around the guides. The guides themselves (titles,
 * chapters, page counts, covers) come from the guides API, so this file holds only what the pages say about them.
 * Node-safe: build/staticPages.ts reads it for the pre-rendered page.
 */
import { ICONS } from "../../components/site/icons";

/** The only "price" the library shows. No strike-through prices, no countdowns. */
export const FREE_LABEL = "Free · 2026";

/** Who wrote the guides (true: the Zinwe team made all four). */
export const GUIDE_AUTHOR = "Written by the Zinwe team";

/** What every guide in the library has. Checked against all four guides (22 Oct 2026). */
export const GUIDE_PROMISES: ReadonlyArray<{ title: string; icon: string }> = [
  { title: "Plain English", icon: ICONS.doc },
  { title: "Printable checklists", icon: ICONS.tasks },
  { title: "Step-by-step plans", icon: ICONS.clock },
];

/** How the free membership works, in the order it happens (the GuideGate flow). */
export const FREE_STEPS: ReadonlyArray<{ title: string; text: string }> = [
  { title: "Enter your email", text: "On the book's page. No card and nothing to install." },
  { title: "Confirm it", text: "Click the link in the email we send you." },
  { title: "Download the PDF", text: "Keep it, print it and share it with your team." },
];

export const FREE_TITLE = "Get any book in 3 steps";

/** The honesty line: what the email actually signs you up for. */
export const FREE_HONESTY =
  "Your email gets you a free Zinwe membership: every book, plus our story series by email. Unsubscribe any time. Your books stay yours.";

export const GUIDE_NOTE = "General guidance, not legal or professional advice. Adapt it to your business.";
