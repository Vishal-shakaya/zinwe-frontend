import { useSyncExternalStore } from "react";

const subscribers = (query: string) => (onChange: () => void): (() => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const SUBSCRIBE: Record<string, (onChange: () => void) => () => void> = {};

/**
 * true on a screen no wider than `maxWidth` (default 760 px, the website's phone breakpoint in the site CSS).
 * Updates live when the window is resized or the phone turned.
 */
export function useIsPhone(maxWidth = 760): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const subscribe = (SUBSCRIBE[query] ??= subscribers(query));
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches,
    () => false,
  );
}
