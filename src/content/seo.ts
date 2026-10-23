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
/** The tagline, in one form everywhere (hero badge, footer, offer band, structured data). Owner decision
 *  2026-10-15: "IT Is OK.", always next to what Zinwe does (mantra "Security, simplified" / the descriptor). */
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
  /** Put in sitemap.xml (public, indexable, not a duplicate). The build fails if a public route in
   *  src/routes.tsx has no entry here (build/seoPages.ts checkRouteCoverage). */
  sitemap: boolean;
  /** Kept out of search results: robots noindex and no canonical (NOINDEX_FILES). */
  noindex?: boolean;
}

/**
 * Static files for addresses search engines must not index, so even a crawler that never runs JavaScript gets
 * "noindex" (the app also sets it, but only once it has loaded). The server sends `/signup` → signup.html etc.;
 * `app.html` for every /app, /onboarding and /quote address; `404.html`, with status 404, for any address that
 * isn't a page (zinwe-server nginx_spa_block). The app then draws the right screen as usual.
 */
export const NOINDEX_FILES: ReadonlyArray<{ file: string; page: SeoPage }> = [
  { file: "signup.html", page: { path: "/signup", title: "Create your account — Zinwe", description: "Create a Zinwe account to protect your team's PCs. Start free forever for up to 3 PCs.", h1: "Create your Zinwe account", intro: ["Start free forever for up to 3 PCs. No card needed."], sitemap: false, noindex: true } },
  { file: "login.html", page: { path: "/login", title: "Log in — Zinwe", description: "Log in to see your PCs, set USB rules and check recent activity.", h1: "Log in to Zinwe", intro: ["See your PCs, set USB rules and check what happened today."], sitemap: false, noindex: true } },
  { file: "forgot-password.html", page: { path: "/forgot-password", title: "Reset your password — Zinwe", description: "Reset your Zinwe password with a code sent to your email.", h1: "Reset your password", intro: ["We'll email you a code to set a new password."], sitemap: false, noindex: true } },
  { file: "newsletter.html", page: { path: "/newsletter", title: "Newsletter — Zinwe", description: "Manage your Zinwe blog subscription.", h1: "Your Zinwe newsletter", intro: ["Confirm or manage your subscription to the Zinwe blog."], sitemap: false, noindex: true } },
  { file: "app.html", page: { path: "/app", title: "Zinwe dashboard", description: "The Zinwe dashboard for signed-in owners.", h1: "Zinwe dashboard", intro: ["Log in to see your dashboard."], sitemap: false, noindex: true } },
  { file: "404.html", page: { path: "/404", title: "Page not found — Zinwe", description: "This page doesn't exist. Head back to the Zinwe home page or get in touch.", h1: "Page not found", intro: ["The link may be old, or the address mistyped."], sitemap: false, noindex: true } },
];

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
    a: "No. You answer a few questions, install Zinwe on each PC and connect it with the person's Member ID, and your rules reach every PC within about a minute. Most small offices are set up in an afternoon.",
  },
  {
    q: "Does it help with India's DPDP Act and US monitoring laws?",
    a: "It helps. Each employee gives their own consent on their PC, and you can see who agreed and when. Zinwe doesn't make a business compliant on its own, so check what your state or sector requires.",
  },
  {
    q: "Can I use Zinwe in the United States?",
    a: "Yes. Zinwe is built for small businesses in India and the United States. Outside India you pay in US dollars, once a year, by card or US bank transfer — with no Indian GST. In India you pay in rupees each month by UPI or bank transfer.",
  },
  {
    q: "Which computers does it work on?",
    a: "Windows PCs today. Linux and macOS are on our roadmap, and we'll announce them on the Zinwe blog.",
  },
  {
    q: "How much does Zinwe cost?",
    a: "Zinwe is free forever for up to 3 PCs. Paid plans are priced by the number of PCs, not per person: in India you pay in rupees each month, elsewhere in US dollars once a year. No card is needed to start.",
  },
];

const PAGES: readonly SeoPage[] = [
  {
    path: "/",
    // Keyword theme: small business data protection / business security without an IT team (ZINWE-SEO-ONPAGE-001).
    title: "Small business data protection in plain English | Zinwe",
    description:
      "Data protection for small businesses with no IT team: know when files go to a USB drive, a remote-access tool runs or new software appears. Free for 3 PCs.",
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
    title: "Plans and pricing: free for up to 3 PCs | Zinwe",
    description:
      "Start free for up to 3 PCs. Paid plans are priced per PC, not per seat, for 10, 25 or 50 PCs. India: rupees, monthly. Elsewhere: US dollars, yearly.",
    h1: "Simple plans. Start free.",
    intro: [
      "Free forever for up to 3 PCs. Startups covers up to 10 PCs, Teams up to 25 and Businesses up to 50, each with every feature and a longer history. Not sure? Tell the page how many PCs you have and it points to the plan that fits.",
      "Every plan has plain-English alerts, employee consent on every PC and a setup you can finish in an afternoon.",
    ],
    sitemap: true,
  },
  {
    path: "/download",
    title: "Download Zinwe for Windows 10 and 11",
    description:
      "Download the Zinwe installer for Windows 10 and 11. Install it on each PC, connect it with the person's email and Member ID, and it shows up in your dashboard.",
    h1: "Download Zinwe for Windows.",
    intro: [
      "One small app on each Windows 10 or 11 PC. Install it, connect it with the person's work email and Member ID from your dashboard, and the PC shows up within about a minute.",
      "Every employee sees the Zinwe widget and agrees on their own PC before anything is recorded. Linux and macOS are on our roadmap.",
    ],
    sitemap: true,
  },
  {
    path: "/early-access",
    title: "Book a free setup call | Zinwe",
    description:
      "Book a free 20-minute setup call with the Zinwe founder: we set up your rules and first PCs with you. Zinwe is free forever for up to 3 PCs.",
    h1: "Book a free setup call.",
    intro: [
      "Zinwe is live: you can start free right now. Prefer a hand? Book a free 20-minute call and we'll set it up with you, rules and first PCs included.",
    ],
    sitemap: true,
  },
  {
    path: "/contact",
    title: "Contact Zinwe: talk to a person, not a ticket",
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
    path: "/whats-new",
    title: "What's new in Zinwe | release notes",
    description:
      "What changed in each Zinwe release: the fixes and the new things you can do, in plain words.",
    h1: "What's new in Zinwe.",
    intro: ["What we fixed and what you can do now, release by release."],
    sitemap: true,
  },
  {
    path: "/blog",
    title: "Data protection guides for small businesses | Zinwe blog",
    description:
      "Simple guides on protecting customer and company data without an IT team: checklists, how-tos and Zinwe news, for small businesses in India and the US.",
    h1: "Guides, releases and news",
    intro: [
      "Simple guides on protecting customer and company data without an IT team: checklists, how-tos, product releases and news.",
    ],
    // Listed even before the first article; the backend's /sitemap.xml adds every published article.
    sitemap: true,
  },
  {
    path: "/blog/series",
    title: "Zinwe series — members-only stories for business owners",
    description:
      "Short story series about company data, people's identities and children growing up online, each episode with a 10-minute fix. Free membership.",
    h1: "Stories, not lectures",
    intro: [
      "Members-only series for business owners, their teams and their families: short episodes about company data, people's identities and children growing up online, each with a 10-minute fix. Membership is free.",
    ],
    // The backend's /sitemap.xml adds each live series and its released episodes.
    sitemap: true,
  },
  {
    path: "/blog/guides",
    title: "Free guides for small businesses — Zinwe",
    description:
      "Plain-English e-guides with workbooks and 30-day plans: protect your business online, keep data safe, stop scams and communicate better at work.",
    h1: "Practical guides for small businesses",
    intro: [
      "Plain-English e-guides with workbooks and 30-day plans you can actually finish. No jargon, no scare statistics, no IT department needed. Free for members.",
    ],
    // The backend's /sitemap.xml adds each live guide.
    sitemap: true,
  },
  {
    path: "/legal",
    title: "Legal: terms, privacy and policies | Zinwe",
    description: "Zinwe's Terms, Privacy, Refund, Shipping and Delivery, Cookie and Acceptable Use policies, and our Disclaimer.",
    h1: "Legal",
    intro: ["Zinwe's Terms, Privacy, Refund, Shipping and Delivery, Cookie and Acceptable Use policies, and our Disclaimer."],
    sitemap: true,
  },
];

/** One legal page's entry, from its document in content/legal.ts. */
export function legalSeo(doc: { slug: string; title: string; summary: string }): SeoPage {
  return {
    path: `/legal/${doc.slug}`,
    title: `${doc.title} | Zinwe`,
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
  // Verified: the agent is a 64-bit Windows 10/11 MSI (window-app); Linux and macOS aren't released.
  operatingSystem: "Windows 10, Windows 11",
  downloadUrl: `${SITE_URL}/download`,
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
