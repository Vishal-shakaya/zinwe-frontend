import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Code-split pages + stale tabs: when the code changes (a deploy, or edits during
 * development) an already-open tab can ask for a page chunk that no longer exists.
 * The import then rejects, and without handling React drops the whole screen
 * (e.g. a blank page right after the sign-up code was accepted).
 *
 * lazyPage() turns that into one automatic reload, which fetches the current code.
 * A timestamp in sessionStorage stops reload loops: if the chunk is still missing
 * after the reload, the error reaches <PageErrorBoundary>, which explains and
 * offers a Reload button instead of a blank screen.
 */

const RELOAD_KEY = "zinwe.chunk-reload-at";
const RELOAD_WINDOW_MS = 30_000;

/** True for the errors browsers and Vite raise when a code-split chunk can't be fetched. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk .* failed|ChunkLoadError/i.test(
    message,
  );
}

/** Reload once to pick up fresh code. Returns false if we already did so moments ago. */
export function reloadOnceForFreshCode(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still allow this one reload.
  }
  window.location.reload();
  return true;
}

/** React.lazy for route pages: a failed chunk triggers one fresh-code reload. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await load();
    } catch (error) {
      // Browsers cache a failed module fetch, so retrying import() in place doesn't help;
      // a reload is what actually gets the new code.
      if (isChunkLoadError(error) && reloadOnceForFreshCode()) {
        return new Promise<never>(() => {}); // the page is reloading; keep showing the loader
      }
      throw error;
    }
  });
}
