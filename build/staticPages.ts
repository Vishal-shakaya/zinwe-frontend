/**
 * The static (pre-JavaScript) body of each public page, for build/seoPages.ts.
 *
 * Crawlers that don't run JavaScript (Bing in part, AI crawlers, link previews) read only this, so it carries the
 * page's real copy: one h1 (the page's own, from src/content/seo.ts), its sections as h2/h3, paragraphs, lists, the
 * questions, and a footer that links every public page (no orphans). Everything comes from the same content files
 * the React pages use (src/content/**), so the two never disagree. Prices are never written: they come from the plans
 * API, so the plans page says what each plan includes and links /plans.
 *
 * A few headings and lines are typed inside the page components rather than in src/content. Those are written here
 * through `fromPage(file, text)`, and `checkPageLiterals` fails the build when one no longer appears in that file,
 * so a copy change on the page can't leave this static version behind silently.
 *
 * Node-safe: imports only src/content files (no React, no browser globals).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_MSI_URL, AGENT_RELEASE, DOWNLOAD_CLOSE, DOWNLOAD_FAQ, DOWNLOAD_HERO, NEVERS, PATHS, PATH_NOTE, REQUIREMENTS, SILENT_INSTALL, WARNS, WARN_INTRO } from "../src/content/download.ts";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED, type LegalDoc } from "../src/content/legal.ts";
import { BRAND_LINE, HOME_FAQ, type SeoPage } from "../src/content/seo.ts";
import { ACTIVE_MEMBERS, WALL_COPY } from "../src/content/site/clients.ts";
import { CLOSE, FAIR, HERO, MEMBER_QUOTE, PROTECTION as HOME_PROTECTION, RULES, STEPS, TEAM_SIDE, TILES_INTRO } from "../src/content/site/home.ts";
import { LEGAL_SUMMARY_UPDATED, POLICY_SUMMARIES } from "../src/content/site/legalSummary.ts";
import { COMPARE_ROWS, PLAN_COPY, PLANS_CLOSE, PLANS_FAQ, PROMISES, WHY, fill } from "../src/content/site/plans.ts";
import { ALERTS, CHAT, HOURS, PLAN_TAG, PRIVACY, PRODUCT_CLOSE, PRODUCT_HERO, PROTECTION, REPORTS, TASKS } from "../src/content/site/product.ts";
import { FOOTER_ABOUT, FOOTER_COLUMNS } from "../src/content/site/shell.ts";

// ---- HTML helpers ---------------------------------------------------------------------------------------------

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const e = escapeHtml;
const p = (text: string): string => `<p>${e(text)}</p>`;
const h = (level: 2 | 3, text: string, id?: string): string => `<h${level}${id ? ` id="${id}"` : ""}>${e(text)}</h${level}>`;
const a = (href: string, label: string): string => `<a href="${e(href)}">${e(label)}</a>`;
const ul = (items: readonly string[]): string => (items.length ? `<ul>${items.map((i) => `<li>${e(i)}</li>`).join("")}</ul>` : "");
const ol = (items: readonly string[]): string => (items.length ? `<ol>${items.map((i) => `<li>${e(i)}</li>`).join("")}</ol>` : "");
const section = (inner: string, id?: string): string => `<section${id ? ` id="${id}"` : ""}>${inner}</section>`;
const faq = (items: ReadonlyArray<{ q: string; a: string }>): string => items.map((f) => h(3, f.q) + p(f.a)).join("");
const hasSlot = (text: string): boolean => /\{\w+\}/.test(text);

// ---- Strings typed in the page components (checked at build) --------------------------------------------------

const PAGE_LITERALS: Array<[file: string, text: string]> = [];
/** `text` as written in `file` (relative to src/pages or src/components). checkPageLiterals verifies it's still there. */
function fromPage(file: string, text: string): string {
  PAGE_LITERALS.push([file, text]);
  return text;
}

/**
 * Every string taken from a page component must still be in that component (whitespace and case ignored).
 * Returns the ones that drifted, as messages; seoPages fails the build on any.
 */
export function checkPageLiterals(root: string): string[] {
  const norm = (s: string): string => s.replace(/\s+/g, " ").toLowerCase();
  const cache = new Map<string, string>();
  const problems: string[] = [];
  for (const [file, text] of PAGE_LITERALS) {
    if (!cache.has(file)) cache.set(file, norm(readFileSync(join(root, "src", file), "utf8")));
    if (!cache.get(file)!.includes(norm(text))) problems.push(`"${text}" is no longer in src/${file}`);
  }
  return problems;
}

// ---- The footer every static page carries ---------------------------------------------------------------------

const sentenceCase = (s: string): string => s.charAt(0) + s.slice(1).toLowerCase();

/** Pages every static page must link (setup call, release notes, legal index and every policy included). */
export const REQUIRED_LINKS: readonly string[] = [
  "/",
  "/product",
  "/plans",
  "/download",
  "/blog",
  "/blog/guides",
  "/blog/series",
  "/whats-new",
  "/early-access",
  "/contact",
  "/legal",
  ...LEGAL_DOCS.map((d) => `/legal/${d.slug}`),
];

function footer(): string {
  const cols: Array<{ label: string; links: Array<[string, string]> }> = [
    {
      label: "Zinwe",
      links: [
        ["/", "Home"],
        ["/early-access", "Book a free setup call"],
      ],
    },
    ...FOOTER_COLUMNS.map((col) => ({
      label: sentenceCase(col.label),
      links: col.links.map((l): [string, string] => [l.to ?? l.href ?? "/", l.label]),
    })),
    {
      label: "Legal",
      links: [["/legal", fromPage("pages/LegalPage.tsx", "All policies, in short")], ...LEGAL_DOCS.map((d): [string, string] => [`/legal/${d.slug}`, d.title])],
    },
  ];
  const nav = cols
    .map((c) => `<div><p><b>${e(c.label)}</b></p><ul>${c.links.map(([href, label]) => `<li>${a(href, label)}</li>`).join("")}</ul></div>`)
    .join("");
  return (
    `<footer class="seo-static__foot"><nav aria-label="Zinwe site">${nav}</nav>` +
    p(FOOTER_ABOUT) +
    p(`Zinwe — ${BRAND_LINE.replace(/\.$/, "")} | ${fromPage("components/site/SiteFooter.tsx", "Security, simplified.")}`) +
    `</footer>`
  );
}

/** Paths a static body links to (query and hash dropped). */
export function linkedPaths(html: string): Set<string> {
  return new Set([...html.matchAll(/<a href="([^"]+)"/g)].map(([, href]) => href.replace(/&amp;/g, "&").split(/[?#]/)[0] || "/"));
}

// ---- Pages ----------------------------------------------------------------------------------------------------

const START_FREE = (): string => a("/signup?plan=free", fromPage("pages/HomePage.tsx", "Start free, up to 3 PCs"));

function home(): string {
  const tiles: Array<[href: string, title: string, body: string, link: string]> = [
    ["/product#chat", "Message anyone, right at their PC.", "Keep work talk out of WhatsApp groups. Messages arrive in seconds, with Seen ticks, and any one can become a task.", "How chat works"],
    ["/product#tasks", "Send a task. Watch it move.", "Due dates, steps and a stage bar. Approve the work when it's done.", "How tasks work"],
    ["/product#reports", "See the week in ten seconds.", "Hours, tasks done, apps and websites, per person. On paid plans, a PDF can land in your inbox every Monday.", "What reports show"],
    ["/product#hours", "Attendance that runs itself.", "Start day, Take a break, End day: one tap on each PC. Long breaks ask for your OK.", "How work hours work"],
    ["/product#alerts", "Plain English, not logs.", "What happened, what it means, and one button for what to do next.", "How alerts work"],
  ];
  return [
    p(`${HERO.badge} ${HERO.badgeText}`),
    ul(HERO.ticks),
    `<p>${START_FREE()} · ${a("/download", "Download for Windows")}</p>`,
    section(h(2, fromPage("components/site/SiteClients.tsx", "Small businesses that run their office on Zinwe")) + ul(ACTIVE_MEMBERS)),
    section(
      h(2, TILES_INTRO.title) +
        p(TILES_INTRO.lead) +
        tiles
          .map(([href, title, body, link]) => h(3, fromPage("pages/HomePage.tsx", title)) + p(fromPage("pages/HomePage.tsx", body)) + `<p>${a(href, fromPage("pages/HomePage.tsx", link))}</p>`)
          .join(""),
    ),
    section(
      h(2, HOME_PROTECTION.title) +
        p(HOME_PROTECTION.lead) +
        RULES.map((r) => h(3, r.title) + p(r.sub) + ul(r.options.map(([key, label]) => `${label}: ${r.out[key]?.title ?? ""}`))).join("") +
        `<p>${a("/product#protection", fromPage("pages/HomePage.tsx", "All six protections"))}</p>`,
    ),
    section(h(2, TEAM_SIDE.title) + p(TEAM_SIDE.lead) + ul(TEAM_SIDE.points)),
    section(
      h(2, fromPage("pages/HomePage.tsx", "Up and running in an afternoon.")) +
        ol(STEPS) +
        `<p>${a("/download", fromPage("pages/HomePage.tsx", "See the install steps"))}</p>`,
    ),
    section(
      h(2, FAIR.title) +
        p(FAIR.lead) +
        FAIR.cards.map((c) => h(3, c.t) + p(c.b)).join("") +
        p(`${fromPage("pages/HomePage.tsx", "Never recorded:")} ${FAIR.nevers.join(", ")}.`),
    ),
    MEMBER_QUOTE
      ? `<figure><blockquote>${e(MEMBER_QUOTE.quote)}</blockquote><figcaption>${e(`${MEMBER_QUOTE.name}, ${MEMBER_QUOTE.role}, ${MEMBER_QUOTE.business}`)}</figcaption></figure>`
      : "",
    section(h(2, fromPage("pages/HomePage.tsx", "Straight answers.")) + faq(HOME_FAQ)),
    section(h(2, CLOSE.title) + p(CLOSE.body) + `<p>${START_FREE()}</p>`),
  ].join("");
}

function product(): string {
  const feature = (id: string, f: { pill: string; title: string; lead: string; points: ReadonlyArray<string | { text: string; tag: string }> }, extra = ""): string =>
    section(
      p(f.pill) +
        h(2, f.title) +
        p(f.lead) +
        ul(f.points.map((pt) => (typeof pt === "string" ? pt : pt.tag && pt.tag in PLAN_TAG ? `${pt.text} (${PLAN_TAG[pt.tag as keyof typeof PLAN_TAG].label})` : pt.text))) +
        extra,
      id,
    );
  return [
    `<ul>${PRODUCT_HERO.jumps.map((j) => `<li>${a(j.href, j.label)}</li>`).join("")}</ul>`,
    feature("chat", CHAT),
    feature("tasks", TASKS),
    feature("hours", HOURS),
    feature("reports", REPORTS),
    feature("alerts", ALERTS, Object.values(ALERTS.demos).map((d) => h(3, d.label) + p(d.title) + p(d.body)).join("")),
    feature("protection", { ...PROTECTION, points: [] }, PROTECTION.doors.map((d) => h(3, d.title) + p(d.body) + p(d.modes.join(" · "))).join("")),
    feature(
      "privacy",
      PRIVACY,
      h(3, fromPage("pages/ProductPage.tsx", "Recorded")) + ul(PRIVACY.recorded) + h(3, fromPage("pages/ProductPage.tsx", "Never recorded")) + ul(PRIVACY.never),
    ),
    section(h(2, WALL_COPY.title) + p(WALL_COPY.body) + ul(ACTIVE_MEMBERS)),
    section(h(2, PRODUCT_CLOSE.title) + p(PRODUCT_CLOSE.body) + `<p>${START_FREE()} · ${a("/plans", "Plans")}</p>`),
  ].join("");
}

/** Plan names by code: the paid ones as the plans content names them; prices and limits live in the plans API. */
const PLAN_NAMES: Record<string, string> = { free: fromPage("content/site/plans.ts", "Free forever"), ...Object.fromEntries(WHY.map((w) => [w.code, w.plan])) };

function plans(): string {
  const order = Object.keys(PLAN_COPY);
  const cards = order
    .map((code) => {
      const copy = PLAN_COPY[code];
      return section(h(2, PLAN_NAMES[code] ?? code) + p(copy.tag) + ul(copy.points.map(([text]) => text).filter((t) => !hasSlot(t))));
    })
    .join("");
  const why = WHY.map((w) => {
    const how = hasSlot(w.how) ? w.fallback : w.how;
    return h(3, w.plan) + p(`“${w.pain}”`) + p(w.fix) + (how ? p(how) : "");
  }).join("");
  const names = order.map((c) => PLAN_NAMES[c] ?? c);
  const cell = (c: string): string => (c === "y" ? "Included" : c === "n" ? "Not included" : c);
  const rows = COMPARE_ROWS.map((r) =>
    "group" in r
      ? `<tr><th colspan="${names.length + 1}" scope="colgroup">${e(sentenceCase(r.group))}</th></tr>`
      : `<tr><th scope="row">${e(r.f)}</th>${r.cells.map((c) => `<td>${e(cell(c))}</td>`).join("")}</tr>`,
  ).join("");
  const table = `<table><thead><tr><th scope="col">Feature</th>${names.map((n) => `<th scope="col">${e(n)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  // The page's own fallbacks while the catalogue loads (PlansPage: first paid plan 10 PCs, largest 50, "Businesses").
  const faqs = PLANS_FAQ.map((f) => {
    const v = { first: 10, top: 50, topName: "Businesses" };
    return { q: fill(f.q, v), a: fill(f.a, v) };
  });
  return [
    ul(PROMISES.map((pr) => `${pr.t}. ${pr.b}`)),
    cards,
    `<p>${a("/signup?plan=free", "Create a free account")}</p>`,
    section(h(2, fromPage("pages/PlansPage.tsx", "Each plan takes one more job off your plate.")) + why),
    section(h(2, fromPage("pages/PlansPage.tsx", "Compare plans")) + table),
    section(h(2, fromPage("pages/PlansPage.tsx", "Clear money, no surprises.")) + faq(faqs)),
    section(h(2, PLANS_CLOSE.title) + p(PLANS_CLOSE.body) + `<p>${START_FREE()}</p>`),
  ].join("");
}

function download(): string {
  const steps = (who: keyof typeof PATHS): string => ol(PATHS[who].map((s) => `${s.t}. ${s.b}`)) + `<p>${e(PATH_NOTE[who].note)} ${a(PATH_NOTE[who].to, PATH_NOTE[who].link)}</p>`;
  return [
    ul(DOWNLOAD_HERO.facts),
    `<p>${a(AGENT_MSI_URL, fromPage("pages/DownloadPage.tsx", "Download for Windows"))} · ${e(`Zinwe ${AGENT_RELEASE.version} · Windows 10 and 11 · 64-bit`)}</p>`,
    p(fromPage("pages/DownloadPage.tsx", "Mac and Linux are on our roadmap.")),
    section(
      h(2, fromPage("pages/DownloadPage.tsx", "From download to working in four steps.")) +
        p(fromPage("pages/DownloadPage.tsx", "Pick the one that's you.")) +
        h(3, fromPage("pages/DownloadPage.tsx", "I got an invite from my company")) +
        steps("member") +
        h(3, fromPage("pages/DownloadPage.tsx", "I'm setting up my office")) +
        steps("owner"),
      "steps",
    ),
    section(h(2, WARN_INTRO.title) + p(WARN_INTRO.body) + ol(WARNS.map((w) => `${w.t}. ${w.b}`)), "warn"),
    section(
      h(2, fromPage("pages/DownloadPage.tsx", "What you need")) +
        `<dl>${REQUIREMENTS.filter((r) => !hasSlot(r.v))
          .map((r) => `<dt>${e(r.k)}</dt><dd>${e(r.v)}</dd>`)
          .join("")}</dl>`,
    ),
    section(
      h(2, fromPage("pages/DownloadPage.tsx", "Install on many PCs at once.")) +
        p(fromPage("pages/DownloadPage.tsx", "Push the same installer with your usual tools. The PC connects by itself; the person still agrees on their own PC.")) +
        `<pre><code>${e(SILENT_INSTALL)}</code></pre>`,
    ),
    section(h(2, fromPage("pages/DownloadPage.tsx", "What Zinwe never does.")) + ul(NEVERS)),
    section(h(2, fromPage("pages/DownloadPage.tsx", "Installing Zinwe: common questions.")) + faq(DOWNLOAD_FAQ)),
    section(h(2, DOWNLOAD_CLOSE.title) + p(DOWNLOAD_CLOSE.body) + `<p>${a("/signup?plan=free", "Create a free account")}</p>`),
  ].join("");
}

function earlyAccess(): string {
  const perks: Array<[string, string]> = [
    ["A 20-minute call, free", "The founder sets up Zinwe with you: your rules, your first PCs, your questions."],
    ["Free forever for up to 3 PCs", "Start today at no cost, no card needed. Upgrade only when you grow."],
    ["Your rules right the first time", "USB, websites and work hours set the way your office actually works."],
  ];
  return [
    ul(perks.map(([t, d]) => `${fromPage("pages/EarlyAccessPage.tsx", t)}: ${fromPage("pages/EarlyAccessPage.tsx", d)}`)),
    `<p>${a("/contact", "Book a free setup call")} · ${a("/signup?plan=free", fromPage("pages/EarlyAccessPage.tsx", "Start free now"))}</p>`,
  ].join("");
}

function contact(): string {
  const onCall = ["Set your first rules together, in plain words", "Connect your first PCs and send a test task", "Answer your questions about privacy and consent"];
  const facts: Array<[string, string]> = [
    ["Office", "SKYTECHNO · New Delhi, India"],
    ["Hours", "Mon–Sat, 10:00–19:00 IST"],
    ["Replies", "Within one working day"],
  ];
  return [
    p(fromPage("pages/ContactPage.tsx", "On the call we")),
    ul(onCall.map((o) => fromPage("pages/ContactPage.tsx", o))),
    `<dl><dt>Email</dt><dd>${a(`mailto:${LEGAL_CONTACT}`, LEGAL_CONTACT)}</dd>${facts
      .map(([k, v]) => `<dt>${e(fromPage("pages/ContactPage.tsx", k))}</dt><dd>${e(fromPage("pages/ContactPage.tsx", v))}</dd>`)
      .join("")}</dl>`,
  ].join("");
}

function whatsNew(): string {
  return `<p>${a("/download", "Download for Windows")} · ${a("/blog", fromPage("pages/WhatsNewPage.tsx", "Zinwe blog"))}</p>`;
}

function blog(): string {
  return [
    section(
      h(2, fromPage("pages/BlogPage.tsx", "Free guides")) +
        p(fromPage("pages/BlogPage.tsx", "PDFs with workbooks and 30-day plans. Free with a membership.")) +
        `<p>${a("/blog/guides", fromPage("pages/BlogPage.tsx", "All guides"))}</p>`,
    ),
    section(
      h(2, fromPage("pages/BlogPage.tsx", "Members' series")) +
        p(fromPage("pages/BlogPage.tsx", "Stories in short episodes, one email at a time. Free with a membership.")) +
        `<p>${a("/blog/series", "Members' series")}</p>`,
    ),
    `<p>${a("/whats-new", fromPage("pages/BlogPage.tsx", "Release notes"))}</p>`,
  ].join("");
}

function legalIndex(): string {
  return [
    p(LEGAL_SUMMARY_UPDATED),
    ...POLICY_SUMMARIES.map((s) =>
      section(h(2, s.title) + p(s.sum) + ul(s.points) + (s.updated ? p(s.updated) : "") + `<p>${a(`/legal/${s.slug}`, s.full)}</p>`, s.id),
    ),
    `<p>${e(fromPage("pages/LegalPage.tsx", "Also on zinwe.io:"))} ${a("/legal/delivery", "Shipping and Delivery Policy")} · ${a("/legal/disclaimer", "Disclaimer")}</p>`,
  ].join("");
}

function legalDoc(doc: LegalDoc): string {
  return [
    `<p>${e(`Last updated ${doc.updated ?? LEGAL_UPDATED} · Operated by SKYTECHNO, New Delhi, India · `)}${a(`mailto:${LEGAL_CONTACT}`, LEGAL_CONTACT)}</p>`,
    ...doc.sections.map((s) => section(h(2, s.heading) + s.blocks.map((b) => (typeof b === "string" ? p(b) : ul(b.list))).join(""))),
  ].join("");
}

const BODIES: Record<string, () => string> = {
  "/": home,
  "/product": product,
  "/plans": plans,
  "/download": download,
  "/early-access": earlyAccess,
  "/contact": contact,
  "/whats-new": whatsNew,
  "/blog": blog,
  "/legal": legalIndex,
};

/** The full static body for one page: <main> (h1, intro, the page's sections) and the site footer. */
export function staticBody(page: SeoPage): string {
  const doc = page.path.startsWith("/legal/") ? LEGAL_DOCS.find((d) => `/legal/${d.slug}` === page.path) : undefined;
  const rest = doc ? legalDoc(doc) : (BODIES[page.path]?.() ?? "");
  const intro = page.intro.map(p).join("");
  return `<main class="wrap seo-static"><h1>${e(page.h1)}</h1>${intro}${rest}</main>${footer()}`;
}

/** Where the React page's own h1 comes from a content file, it must match the SEO entry's h1 (seo.ts). */
export const PAGE_H1: Readonly<Record<string, string>> = {
  "/": HERO.title,
  "/product": PRODUCT_HERO.title,
  "/download": DOWNLOAD_HERO.title,
};
