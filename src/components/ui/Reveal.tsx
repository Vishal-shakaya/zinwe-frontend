import { useRef, type HTMLAttributes, type ReactElement } from "react";
import { useReveal } from "../../hooks/useReveal";
import { cx } from "../../lib/cx";

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Stagger step: maps to `.rv[data-delay]` (0.1 s per step). */
  delay?: 1 | 2 | 3;
}

/** A `<div class="rv">` that fades/slides in once it scrolls into view. */
export function Reveal({ delay, className, children, ...rest }: RevealProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useReveal(ref);
  return (
    <div ref={ref} className={cx(className, "rv", shown && "is-in")} data-delay={delay} {...rest}>
      {children}
    </div>
  );
}
