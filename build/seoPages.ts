/**
 * Build step: a static, search-engine-ready HTML file per public page, plus sitemap.xml.
 *
 * The website is a single-page app, so its index.html has generic tags and an empty #root until
 * JavaScript runs. After `vite build` this plugin writes, from dist/index.html and src/content/seo.ts:
 *
 *   dist/index.html            "/"   (home tags + a plain-HTML version of the page)
 *   dist/<path>.html           every other public page (plans.html, contact.html, legal/privacy.html…)
 *   dist/sitemap.xml           the public pages (the blog has its own: /api/blog/sitemap.xml)
 *
 * Serving: the web server must try `<path>.html` before falling back to index.html, e.g. nginx
 * `try_files $uri $uri.html /index.html;` (a folder + index.html would make nginx redirect /plans to
 * /plans/, which isn't the canonical address). Static hosts like Netlify or Cloudflare do this already.
 *
 * The plain HTML sits in <!--seo-static--> … <!--/seo-static--> NEXT TO #root (not inside it), so the
 * backend's blog pre-render, which fills the empty #root of this same file, still works (it strips
 * the block). With JavaScript an inline script hides the block before paint (and removes it when the
 * address isn't the page's own: the server answers every app route with dist/index.html), and the app
 * removes it on start (lib/prerender.ts); crawlers and visitors without JavaScript read it. Page-specific head tags carry `data-prerender`, so the app owns the head after.
 * The Organization + WebSite structured data goes into index.html itself (dev and build) and stays.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import {
  FAQ_LD,
  HOME_FAQ,
  legalSeo,
  OG_IMAGE,
  ORGANIZATION_LD,
  SEO_PAGES,
  SITE_URL,
  SOFTWARE_LD,
  WEBSITE_LD,
  type SeoPage,
} from "../src/content/seo.ts";
import { LEGAL_DOCS } from "../src/content/legal.ts";

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const jsonLd = (data: unknown): string =>
  `<script type="application/ld+json" data-prerender>${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

const urlOf = (path: string): string => `${SITE_URL}${path}`;

/** Replace the content="" of one existing meta tag in the template. */
function setMeta(html: string, attr: "name" | "property", key: string, content: string): string {
  const pattern = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (!pattern.test(html)) throw new Error(`index.html is missing <meta ${attr}="${key}">`);
  return html.replace(pattern, `$1${escapeHtml(content)}$2`);
}

/** Links every static page carries, so a crawler can walk the site without JavaScript. */
const NAV_LINKS: ReadonlyArray<[string, string]> = [
  ["/", "Home"],
  ["/plans", "Plans and pricing"],
  ["/blog", "Blog"],
  ["/early-access", "Early access"],
  ["/contact", "Contact"],
  ["/legal", "Legal"],
  ["/signup?plan=free", "Start free"],
];

function staticBody(page: SeoPage): string {
  const paragraphs = page.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const faq =
    page.path === "/"
      ? `<h2>Questions owners ask</h2>${HOME_FAQ.map(
          ({ q, a }) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`,
        ).join("")}`
      : "";
  const nav = NAV_LINKS.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join(" · ");
  return `<main class="wrap seo-static"><h1>${escapeHtml(page.h1)}</h1>${paragraphs}${faq}<nav aria-label="Zinwe">${nav}</nav></main>`;
}

/** The page's HTML file from the built index.html. */
export function renderPage(template: string, page: SeoPage): string {
  const url = urlOf(page.path);
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  let html = template.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(page.title)}</title>`);
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "property", "og:title", ogTitle);
  html = setMeta(html, "property", "og:description", ogDescription);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", ogTitle);
  html = setMeta(html, "name", "twitter:description", ogDescription);
  html = html.replace(/<link rel="canonical" href="[^"]*"[^>]*>/, `<link rel="canonical" href="${url}" data-prerender />`);

  const pageLd = page.path === "/" ? jsonLd(SOFTWARE_LD) + jsonLd(FAQ_LD) : "";
  html = html.replace("</head>", `${pageLd}</head>`);

  // Same path with or without a trailing slash; anything else is an app route served this file.
  const own = JSON.stringify(page.path === "/" ? ["/"] : [page.path, `${page.path}/`]);
  const block =
    `<!--seo-static--><div id="seo-static" data-prerender>${staticBody(page)}</div>` +
    // With JavaScript the app draws the page, so the static copy never shows (hidden on its own address,
    // removed on any other); crawlers and visitors without JavaScript read it.
    `<script>(function(){var s=document.getElementById("seo-static");if(!s)return;` +
    `if(${own}.indexOf(location.pathname)<0)s.remove();else s.hidden=true})()</script>` +
    `<!--/seo-static-->`;
  if (!/<div id="root"><\/div>/.test(html)) throw new Error("index.html is missing an empty <div id=\"root\">");
  return html.replace('<div id="root"></div>', `<div id="root"></div>${block}`);
}

export function sitemap(pages: readonly SeoPage[]): string {
  const urls = pages
    .filter((p) => p.sitemap)
    .map((p) => `  <url><loc>${urlOf(p.path)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Vite plugin: runs once after the client build has written dist/. */
export function seoPages(): Plugin {
  let outDir = "dist";
  let building = false;
  return {
    name: "zinwe-seo-pages",
    configResolved(config) {
      outDir = config.build.outDir;
      building = config.command === "build";
    },
    // Who we are, on every page (dev and build): kept for good, the app never removes it.
    transformIndexHtml() {
      return [ORGANIZATION_LD, WEBSITE_LD].map((data) => ({
        tag: "script",
        attrs: { type: "application/ld+json" },
        children: JSON.stringify(data).replace(/</g, "\\u003c"),
        injectTo: "head" as const,
      }));
    },
    // `vite preview` behaves like the production server: /plans → dist/plans.html when it exists.
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? "").split("?")[0].replace(/\/+$/, "");
        if (path && !path.includes(".") && existsSync(join(outDir, `${path.slice(1)}.html`))) {
          req.url = `${path}.html${(req.url ?? "").slice((req.url ?? "").split("?")[0].length)}`;
        }
        next();
      });
    },
    closeBundle() {
      if (!building) return;
      const indexPath = join(outDir, "index.html");
      const template = readFileSync(indexPath, "utf8");
      if (!template.includes(OG_IMAGE)) throw new Error("index.html og:image changed: update OG_IMAGE in seo.ts");
      const pages = [...SEO_PAGES, ...LEGAL_DOCS.map(legalSeo)];
      for (const page of pages) {
        const file = page.path === "/" ? indexPath : join(outDir, `${page.path.slice(1)}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderPage(template, page));
      }
      writeFileSync(join(outDir, "sitemap.xml"), sitemap(pages));
    },
  };
}
