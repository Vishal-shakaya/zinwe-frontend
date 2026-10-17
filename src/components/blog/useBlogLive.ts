import { useEffect, useState } from "react";
import { getArticles } from "../../lib/api/blog";

const KEY = "zinwe.blogLive";

/** Remembered for the tab, so the nav doesn't flicker on every page. */
function remembered(): boolean | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

let shared: Promise<boolean> | null = null;

/** One small request per tab: is at least one article published? A failure counts as "no". */
function check(): Promise<boolean> {
  shared ??= getArticles({})
    .then((page) => page.count > 0 || page.results.length > 0)
    .catch(() => false)
    .then((live) => {
      try {
        window.sessionStorage.setItem(KEY, live ? "1" : "0");
      } catch {
        // Storage blocked: we ask again next tab.
      }
      return live;
    });
  return shared;
}

/**
 * True once the blog has at least one published article (2026-10-17: the "Blog" links stay hidden until
 * then, so an empty page never looks unfinished). On /blog itself it's always shown.
 */
export function useBlogLive(): boolean {
  const [live, setLive] = useState<boolean>(() => remembered() ?? false);
  useEffect(() => {
    if (remembered() !== null) return;
    let alive = true;
    void check().then((value) => {
      if (alive) setLive(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return live;
}
