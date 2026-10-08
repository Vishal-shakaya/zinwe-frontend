import { useEffect, useState, type RefObject } from "react";

export interface InViewOptions {
  threshold?: number;
  rootMargin?: string;
  /** Latch to true on the first intersection and stop observing. */
  once?: boolean;
  /** Do not observe at all (state stays false). */
  skip?: boolean;
}

/**
 * Tracks whether `ref` intersects the viewport. Falls back to `true` when
 * IntersectionObserver is unavailable (same as the static site).
 */
export function useInView(
  ref: RefObject<Element | null>,
  { threshold = 0, rootMargin = "0px", once = false, skip = false }: InViewOptions = {},
): boolean {
  const supported = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || skip || !supported) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (once) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        } else {
          setInView(entry.isIntersecting);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin, once, skip, supported]);

  return supported ? inView : !skip;
}
