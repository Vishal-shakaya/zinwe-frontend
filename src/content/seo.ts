/**
 * Search and link-preview copy for every public page, in one place.
 *
 * Read by the pages (`usePageMeta(seoFor("/plans"))`) AND by the build: `vite.config.ts` writes a
 * static `dist/<path>/index.html` per page with these tags plus a plain-HTML version of the page
 * (h1 + intro + links), so search engines, AI crawlers and link previews see real content before
 * any JavaScript runs. It also writes `dist/sitemap.xml`. Keep this file free of browser and React
 * imports — the build runs it in Node — and of big imports: it's in the home page's bundle (the legal
 * pages' entries are built from legal.ts by `legalSeo`, in the build and on the legal page).
 *
 * Copy rules (.cloude/marketing/marketing-context.md §3): only features that ship, no surveillance
 * words, no prices (they live in the plan catalogue), India and the US treated equally.
 */
export const SITE_URL = "https://zinwe.io";
export const BRAND_LINE = "IT Is OK.";
export const OG_IMAGE = `${SITE_URL}/brand/og-image.png`;

/** Routes that must never be indexed (signed-in app, onboarding, sign-in, personal links). */
export const NOINDEX_PREFIXES = ["/app", "/onboarding", "/login", "/signup", "/forgot-password", "/newsletter", "/quote"];

export interface SeoPage {
  path: string;
  /** <title>: ~50–60 characters, the main topic first, brand last. */
  title: string;
  /** Meta description: ~140–160 characters, plain and specific. */
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  /** The static (pre-JavaScript) page body: its h1 and a few short paragraphs. */
  h1: string;
  intro: readonly string[];
  /** Put in sitemap.xml (public, indexable, not a duplicate). */
  sitemap: boolean;
}

/** The homepage FAQ: shown on the page and sent as FAQPage structured data. */
export const HOME_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "What is Zinwe?",
    a: "Zinwe is data protection and activity monitoring for small businesses without an IT team. A small agent on each Windows PC flags things like USB copies, files leaving the office, remote-access tools and new software, and you read every alert in plain English on one dashboard.",
  },
  {
    q: "Is Zinwe spyware?",
    a: "No. Zinwe protects company data on company PCs, with your team's knowledge. Every employee sees the Zinwe widget and agrees on their own PC before anything is recorded. Zinwe never records keystrokes, screens, or what's inside files, emails or messages.",
  },
  {
    q: "Do I need an IT person to set it up?",
    a: "No. You answer a few questions, install Zinwe on each PC with a one-time ID, and your rules reach every PC within about a minute. Most small offices are set up in an afternoon.",
  },
  {
    q: "Does it help with India's DPDP Act and US monitoring laws?",
    a: "It helps. Each employee gives their own consent on their PC, and you can see who agreed and when. Zinwe doesn't make a business compliant on its own, so check what your state or sector requires.",
  },
  {
    q: "Can I use Zinwe in the United States?",
    a: "Yes. Zinwe is built for small businesses in India and the United States. Outside India you pay in US dollars, once a year, by card or US bank transfer — with no Indian GST. In India you pay in rupees each month by UPI or bank transfer, plus GST.",
  },
  {
    q: "Which computers does it work on?",
    a: "Windows PCs today. Linux and macOS are next, and we'll announce them on the Zinwe blog.",
  },
  {
    q: "How much does Zinwe cost?",
    a: "Zinwe is free forever for up to 3 PCs. Paid plans are priced by the number of PCs, not per person, and billed one month at a time. No card is needed to start.",
  },
];

const PAGES: readonly SeoPage[] = [
  {
    path: "/",
    title: "Zinwe — Data protection for small businesses, in plain English",
    description:
      "Know when files go to a USB drive, a remote-access tool runs or new software appears, explained in plain English. For teams of 5–50. Free for 3 PCs.",
    ogTitle: "Zinwe — IT Is OK. Data protection for small businesses.",
    ogDescription: "Know what's happening to your company's data. In plain English. No IT department needed.",
    h1: "Know what's happening to your company's data. In plain English.",
    intro: [
      "Zinwe is data protection and activity monitoring for small businesses without an IT team. It flags USB copies, files leaving the office, remote-access tools and new software on your team's PCs, and tells you what each one means.",
      "Free forever for up to 3 PCs. No card needed. For teams of 5–50 in India and the United States, on Windows today.",
    ],
    sitemap: true,
  },
  {
    path: "/plans",
    title: "Plans and pricing — Zinwe | Free for up to 3 PCs",
    description:
      "Start free for up to 3 PCs. Paid plans are priced by the number of PCs, not per seat. India: rupees, monthly, + GST. Outside India: US dollars, yearly.",
    h1: "Simple plans. Start free.",
    intro: [
      "Free forever for up to 3 PCs. Startups adds full data protection for up to 10 PCs, and Businesses adds work hours, app usage and team chat for up to 50.",
      "Every plan has plain-English alerts, employee consent on every PC and a setup you can finish in an afternoon.",
    ],
    sitemap: true,
  },
  {
    path: "/early-access",
    title: "Early access — Zinwe",
    description:
      "Reserve early access to Zinwe: free forever for up to 3 PCs, setup done with you on a short call, and a say in what we build next.",
    h1: "Be first. Start free, stay free.",
    intro: ["Reserve a spot before launch and we'll set you up personally the week we go live."],
    sitemap: true,
  },
  {
    path: "/contact",
    title: "Contact Zinwe — talk to a person, not a ticket",
    description:
      "Questions about setup, pricing or whether Zinwe fits your business? Write to hello@zinwe.io and hear back from the founder within a working day.",
    h1: "Talk to a person, not a ticket.",
    intro: [
      "Questions about setup, pricing, or whether Zinwe fits your business. You'll hear back from the founder within a working day.",
      "Email hello@zinwe.io. SKYTECHNO, New Delhi, India.",
    ],
    sitemap: true,
  },
  {
    path: "/blog",
    title: "Blog — practical data protection for small businesses | Zinwe",
    description:
      "Simple guides on protecting customer and company data without an IT team: checklists, how-tos and Zinwe news, for small businesses in India and the US.",
    h1: "The Zinwe blog",
    intro: [
      "Simple guides on protecting customer and company data without an IT team: checklists, how-tos, product releases and news.",
    ],
    sitemap: true,
  },
  {
    path: "/legal",
    title: "Legal — Zinwe",
    description: "Zinwe's Terms, Privacy, Refund, Cookie and Acceptable Use policies, and our Disclaimer.",
    h1: "Legal",
    intro: ["Zinwe's Terms, Privacy, Refund, Cookie and Acceptable Use policies, and our Disclaimer."],
    sitemap: true,
  },
];

/** One legal page's entry, from its document in content/legal.ts. */
export function legalSeo(doc: { slug: string; title: string; summary: string }): SeoPage {
  return {
    path: `/legal/${doc.slug}`,
    title: `${doc.title} — Zinwe`,
    description: doc.summary,
    h1: doc.title,
    intro: [doc.summary],
    sitemap: true,
  };
}

export const SEO_PAGES: readonly SeoPage[] = PAGES;

/** The SEO entry for `path` (exact match). */
export function seoFor(path: string): SeoPage {
  const page = PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`No SEO entry for ${path}`);
  return page;
}

export function isNoindex(path: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// ---- Structured data (schema.org JSON-LD) --------------------------------------

export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Zinwe",
  legalName: "SKYTECHNO",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  slogan: BRAND_LINE,
  email: "hello@zinwe.io",
  address: { "@type": "PostalAddress", addressLocality: "New Delhi", addressCountry: "IN" },
  areaServed: ["IN", "US"],
  sameAs: [
    "https://www.linkedin.com/showcase/hello.zinwe/",
    "https://www.youtube.com/@hellozinwe",
    "https://www.instagram.com/hello.zinwe/",
    "https://www.facebook.com/hello.zinwe",
  ],
} as const;

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Zinwe",
  url: SITE_URL,
  inLanguage: "en",
} as const;

/** The product. Only the free plan's price is stated: paid prices live in the plan catalogue. */
export const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zinwe",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Windows",
  description:
    "Data protection and activity monitoring for small businesses without an IT team: USB drive control, alerts for files leaving the office, remote-access tool detection, new software alerts and website protection, explained in plain English.",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    name: "Free forever",
    price: "0",
    priceCurrency: "INR",
    description: "Free forever for up to 3 PCs.",
  },
  publisher: { "@type": "Organization", name: "Zinwe", url: SITE_URL },
} as const;

export const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
} as const;
