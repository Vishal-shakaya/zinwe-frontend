import type { RefObject } from "react";
import { useInView } from "./useInView";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Scroll reveal for `.rv` elements: returns true once the element has entered
 * the viewport (then `.is-in` should be applied). With reduced motion it is
 * true immediately, matching site.js.
 */
export function useReveal(ref: RefObject<Element | null>): boolean {
  const reduce = usePrefersReducedMotion();
  const seen = useInView(ref, {
    once: true,
    threshold: 0.1,
    rootMargin: "0px 0px -10% 0px",
    skip: reduce,
  });
  return reduce || seen;
}
