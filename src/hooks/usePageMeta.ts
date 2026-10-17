import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isNoindex, SITE_URL } from "../content/seo";

export interface PageMeta {
  title: string;
  description: string;
  /** og:title / twitter:title, defaults to `title`. */
  ogTitle?: string;
  /** og:description / twitter:description, defaults to `description`. */
  ogDescription?: string;
  /** Keep this page out of search results even on a public path (the 404 page). */
  noindex?: boolean;
}

/** Set (or create) one `<meta>` by name/property. */
function setMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** The one canonical link: this page's address on zinwe.io, without query or hash. */
function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Sets <title>, the description, canonical URL, Open Graph + Twitter tags and robots for the current
 * page. Private routes (the app, onboarding, sign-in, personal links) get `noindex` automatically.
 * Public pages take their copy from content/seo.ts, the same source the build pre-renders from.
 */
export function usePageMeta({ title, description, ogTitle, ogDescription, noindex = false }: PageMeta): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
    const url = `${SITE_URL}${path === "/" ? "/" : path}`;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", ogTitle ?? title);
    setMeta("property", "og:description", ogDescription ?? description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", ogTitle ?? title);
    setMeta("name", "twitter:description", ogDescription ?? description);
    setMeta("name", "robots", noindex || isNoindex(path) ? "noindex, nofollow" : "index, follow");
    setCanonical(url);
  }, [pathname, title, description, ogTitle, ogDescription, noindex]);
}
