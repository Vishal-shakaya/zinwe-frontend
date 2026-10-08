import { useEffect } from "react";

export interface PageMeta {
  title: string;
  description: string;
  /** og:title, defaults to `title`. */
  ogTitle?: string;
  /** og:description, defaults to `description`. */
  ogDescription?: string;
}

function setMeta(selector: string, content: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

/** Sets <title> and the description / Open Graph meta tags for the current page. */
export function usePageMeta({ title, description, ogTitle, ogDescription }: PageMeta): void {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', ogTitle ?? title);
    setMeta('meta[property="og:description"]', ogDescription ?? description);
  }, [title, description, ogTitle, ogDescription]);
}
