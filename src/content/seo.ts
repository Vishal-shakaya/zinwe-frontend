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
 * Copy rules (.claude/marketing/context.md §3): only features that ship, no surveillance
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
  { file: "signup.html", page: { path: "/signup", title: "Create your account | Zinwe", description: "Create a Zinwe account to protect your team's PCs. Start free forever for up to 3 PCs.", h1: "Create your Zinwe account", intro: ["Start free forever for up to 3 PCs. No card needed."], sitemap: false, noindex: true } },
  { file: "login.html", page: { path: "/login", title: "Log in | Zinwe", description: "Log in to see your PCs, set USB rules and check recent activity.", h1: "Log in to Zinwe", intro: ["See your PCs, set USB rules and check what happened today."], sitemap: false, noindex: true } },
  { file: "forgot-password.html", page: { path: "/forgot-password", title: "Reset your password | Zinwe", description: "Reset your Zinwe password with a code sent to your email.", h1: "Reset your password", intro: ["We'll email you a code to set a new password."], sitemap: false, noindex: true } },
  { file: "newsletter.html", page: { path: "/newsletter", title: "Newsletter | Zinwe", description: "Manage your Zinwe blog subscription.", h1: "Your Zinwe newsletter", intro: ["Confirm or manage your subscription to the Zinwe blog."], sitemap: false, noindex: true } },
  { file: "app.html", page: { path: "/app", title: "Zinwe dashboard", description: "The Zinwe dashboard for signed-in owners.", h1: "Zinwe dashboard", intro: ["Log in to see your dashboard."], sitemap: false, noindex: true } },
  { file: "404.html", page: { path: "/404", title: "Page not found | Zinwe", description: "This page doesn't exist. Head back to the Zinwe home page or get in touch.", h1: "Page not found", intro: ["The link may be old, or the address mistyped."], sitemap: false, noindex: true } },
];

/**
 * The homepage questions (board SiteHome, 29 Oct 2026): shown on the page and sent as FAQPage structured data.
 * The price answer here has no numbers (prices live in the plan catalogue); on the page it is completed from the
 * plans API (`HOME_PRICE_Q`, pages/HomePage.tsx).
 */
export const HOME_PRICE_Q = "How much does it cost?";
export const HOME_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Is Zinwe spyware?",
    a: "No. Zinwe protects company data with your team's knowledge. Each person sees exactly what it records and agrees on their own PC first. It never records keystrokes, screens, the camera, file contents or full web addresses.",
  },
  {
    q: "Do I need an IT person to set it up?",
    a: "No. Create your free account and add each person with their work email. They install Zinwe on their Windows PC and connect it with their email and Member ID. There are no servers to run or policies to write. Most offices finish in an afternoon.",
  },
  {
    q: "Can I use Zinwe just for chat and tasks?",
    a: "Yes. Switch on only what you need. You can start with chat, tasks and work hours, and turn on data protection later.",
  },
  {
    q: "What does my team see?",
    a: "A small Zinwe window by the clock: your messages, their tasks, the Start day, Take a break and End day buttons, and a plain list of what Zinwe records on their PC.",
  },
  {
    q: "What happens when a PC is offline?",
    a: "Your rules keep working on the PC with the last settings, and work times are saved there. Everything syncs when the internet is back.",
  },
  {
    q: "Does Zinwe work on Mac or Linux?",
    a: "Not yet. Zinwe runs on Windows 10 and 11 PCs today. Mac and Linux are on our roadmap.",
  },
  {
    q: HOME_PRICE_Q,
    a: "Free forever for up to 3 PCs. Paid plans are priced per PC, not per person: in rupees plus GST in India and in US dollars elsewhere, paid monthly or yearly. Nothing is charged automatically.",
  },
];

const PAGES: readonly SeoPage[] = [
  {
    path: "/",
    // Keyword theme: small business data protection / business security without an IT team (ZINWE-SEO-ONPAGE-001).
    title: "Small business data protection in plain English | Zinwe",
    description:
      "Data protection for small businesses with no IT team: see files copied to USB drives, stop remote-control apps and risky sites. Free forever on 3 PCs.",
    ogTitle: "Zinwe — IT Is OK. Data protection for small businesses.",
    ogDescription: "Know what's happening to your company's data. In plain English. No IT department needed.",
    h1: "Run a safe, organised office from one screen.",
    intro: [
      "Zinwe protects your business data on every Windows PC, with no IT team needed, and gives you chat, tasks, work hours and reports in the same place. Simple enough to set up this afternoon.",
      "It flags files copied to pen drives, big uploads and email attachments, remote-control apps such as AnyDesk and new software, and tells you in plain English what each one means. You choose how strict each rule is, and every PC follows it within about a minute.",
      "Your team sees the Zinwe window by the clock and agrees on their own PC before anything is recorded. Zinwe never records keystrokes, screens, the camera, file contents or full web addresses.",
      "Free forever for up to 3 PCs. No card needed. For offices of 5 to 50 people in India and the United States, on Windows 10 and 11 today.",
    ],
    sitemap: true,
  },
  {
    path: "/product",
    title: "Chat, tasks, work hours and data protection | Zinwe",
    description:
      "One app for a small office on Windows: chat with each person, send tasks, see work hours and reports, and get plain-English alerts when data leaves.",
    h1: "One app to run a small office and keep its data safe.",
    intro: [
      "Chat, tasks, work hours, reports, plain-English alerts and data protection for small teams on Windows. Each one is simple on its own, and better together.",
      "Chat with each person right at their PC, turn any message into a task, and approve the work when it's done. Each person taps Start day, Take a break and End day, and long breaks ask for your OK. Reports show who worked when, what got done, and which apps and websites were used.",
      "Data protection covers pen drives, files leaving the office, uploads to the web, remote-control apps, new software and risky websites. For each one, you pick how strict to be.",
      "Nothing starts until each person agrees on their own PC. Free forever for up to 3 PCs.",
    ],
    sitemap: true,
  },
  {
    path: "/plans",
    title: "Plans and pricing per PC, free for up to 3 PCs | Zinwe",
    description:
      "Zinwe is priced per PC, not per person. Start free forever on up to 3 PCs, then move to Startups, Teams or Businesses. Monthly or yearly, no auto-charge.",
    h1: "Protect every PC and run your team, at a small price per PC a month.",
    intro: [
      "Zinwe is priced per PC, not per person. Free forever covers up to 3 PCs. The paid plans, Startups, Teams and Businesses, cover more PCs, keep a longer history and add PDF reports emailed to you on a schedule. Tell the page how many PCs you have and it points to the plan that fits.",
      "Every plan has all six protections with plain-English alerts, chat, tasks, work hours with break approvals, and consent on every PC.",
      "Pay monthly or yearly: in rupees plus GST in India, with a GST invoice, or in US dollars elsewhere. Nothing is charged automatically, and you can change plan any time.",
    ],
    sitemap: true,
  },
  {
    path: "/download",
    title: "Download Zinwe for Windows 10 and 11 PCs | Zinwe",
    description:
      "Download the Zinwe installer for Windows 10 and 11. Install it on each PC, connect it with the person's email and Member ID, and it shows up in your dashboard.",
    h1: "Download Zinwe for Windows.",
    intro: [
      "One small app for each Windows 10 or 11 PC (64-bit). Install it, connect it with the person's work email and Member ID from your dashboard, and the PC shows up within about a minute.",
      "Windows asks for an administrator's OK once. If it says \"Unknown publisher\", that's expected for a new app: choose Keep, then More info and Run anyway. IT helpers can install on many PCs at once with msiexec.",
      "Every employee sees the Zinwe window and agrees on their own PC before anything is recorded. Zinwe is a standard Windows service with no kernel driver, and it keeps its last rules when the PC is offline. Mac and Linux are on our roadmap.",
    ],
    sitemap: true,
  },
  {
    path: "/early-access",
    title: "Book a free setup call for your office PCs | Zinwe",
    description:
      "Book a free 20-minute setup call with the Zinwe founder: we set up your rules and first PCs with you and answer your questions. Free forever on up to 3 PCs.",
    h1: "Book a free setup call.",
    intro: [
      "Want a hand getting started? Book a free 20-minute call with the founder and we set up Zinwe with you: your rules, your first PCs and your questions. Or start free right now on your own.",
      "We set USB, websites and work hours the way your office actually works, so your rules are right the first time. Zinwe is free forever for up to 3 PCs, with no card needed.",
    ],
    sitemap: true,
  },
  {
    path: "/contact",
    title: "Contact us: a real person, not a ticket | Zinwe",
    description:
      "Questions about setup, pricing, consent or whether Zinwe fits your office? Book a free setup call or email hello@zinwe.io. A person replies in a working day.",
    h1: "A person, not a ticket.",
    intro: [
      "Questions about setup, pricing, consent or whether Zinwe fits your office? Book a free 20-minute call and we set up Zinwe with you: your rules, your first PCs, your first tasks. Or send a message, and the founder replies within one working day.",
      "On the call we set your first rules together in plain words, connect your first PCs and send a test task, and answer your questions about privacy and consent.",
      "Email hello@zinwe.io. SKYTECHNO, New Delhi, India. Monday to Saturday, 10:00 to 19:00 IST.",
    ],
    sitemap: true,
  },
  {
    path: "/whats-new",
    title: "Release notes: what's new in each version | Zinwe",
    description:
      "Zinwe release notes in plain words: what's new in each version, what we fixed, and how to update the Zinwe app on your team's Windows 10 and 11 PCs.",
    h1: "What's new in Zinwe.",
    intro: [
      "Release notes in plain words: what's new, what we fixed and what you need to do, version by version.",
      "To update a PC, click Update now in the Zinwe window, or download the installer again from zinwe.io/download. When the notice on the PC changes, each person is asked once to agree again.",
    ],
    sitemap: true,
  },
  {
    path: "/blog",
    title: "Data protection guides for small businesses | Zinwe",
    description:
      "Simple guides on protecting customer and company data without an IT team: checklists, how-tos and Zinwe news, for small businesses in India and the US.",
    h1: "Data protection guides for a safer, calmer office.",
    intro: [
      "Practical guides on keeping company data safe and running a small team, written for owners without an IT team. Short reads, no jargon.",
      "Checklists and how-tos on pen drives, passwords, email and sharing files, plus Zinwe release notes, free e-guides and the members' story series.",
    ],
    // Listed even before the first article; the backend's /sitemap.xml adds every published article.
    sitemap: true,
  },
  {
    path: "/blog/series",
    title: "Members' story series for business owners | Zinwe",
    description:
      "Short story series for business owners about company data, identity and children online. Each episode ends with a 10-minute fix. Free membership.",
    h1: "Stories, not lectures",
    intro: [
      "Members-only series for business owners, their teams and their families: short episodes about company data, people's identities and children growing up online, each with a 10-minute fix. Membership is free.",
    ],
    // The backend's /sitemap.xml adds each live series and its released episodes.
    sitemap: true,
  },
  {
    path: "/blog/guides",
    title: "Free e-guides and workbooks for small businesses | Zinwe",
    description:
      "Free plain-English e-guides with workbooks and 30-day plans: protect your business online, keep data safe, stop scams and communicate better at work.",
    h1: "Free, practical guides for small businesses",
    intro: [
      "Plain-English e-guides with workbooks and 30-day plans you can actually finish. No jargon, no scare statistics, no IT department needed. Free for members, and membership is free.",
    ],
    // The backend's /sitemap.xml adds each live guide.
    sitemap: true,
  },
  {
    path: "/legal",
    title: "Legal: terms, privacy and policies | Zinwe",
    description:
      "Zinwe's policies in plain words: Terms, Privacy, Refunds, Shipping and Delivery, Cookies, Acceptable Use and the Disclaimer, each with a short summary.",
    h1: "Terms and policies, in plain words.",
    intro: [
      "Short summaries of the policies that apply when you use Zinwe: the Terms and Conditions, Privacy Policy, Return and Refund Policy, Shipping and Delivery Policy, Cookie Policy, Acceptable Use Policy and Disclaimer.",
      "Each summary links to the full text, which is what counts. Questions: hello@zinwe.io.",
    ],
    sitemap: true,
  },
];

/** Search titles for the legal pages, so each says what the policy covers (the page heading stays the policy's name). */
const LEGAL_TITLES: Readonly<Record<string, string>> = {
  terms: "Terms and Conditions: using Zinwe",
  privacy: "Privacy Policy: what Zinwe collects",
  refund: "Return and Refund Policy: stopping and refunds",
  delivery: "Shipping and Delivery Policy: when plans start",
  cookies: "Cookie Policy: cookies on zinwe.io",
  "acceptable-use": "Acceptable Use Policy: how to use Zinwe",
  disclaimer: "Disclaimer: what Zinwe can and can't promise",
};

/** One legal page's entry, from its document in content/legal.ts. */
export function legalSeo(doc: { slug: string; title: string; summary: string }): SeoPage {
  return {
    path: `/legal/${doc.slug}`,
    title: `${LEGAL_TITLES[doc.slug] ?? doc.title} | Zinwe`,
    description: doc.summary,
    // The same heading as the page (LegalPage shows "Zinwe <Policy>").
    h1: `Zinwe ${doc.title}`,
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
