import { useId, useState, type ReactElement, type ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

/**
 * The boards' question list: one answer open at a time (the first, to begin with); the + turns into × when open.
 * Each question is a real button with aria-expanded and aria-controls.
 */
export function SiteFaq({
  items,
  compact = false,
  className,
}: {
  items: readonly FaqItem[];
  compact?: boolean;
  className?: string;
}): ReactElement {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <div className={cx("zs-card zs-faq", compact && "zs-faq--compact", className)}>
      {items.map((f, i) => (
        <div key={f.q} className="zs-faq__row">
          <button
            type="button"
            className="zs-faq__q"
            aria-expanded={open === i}
            aria-controls={`${id}-a${i}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>{f.q}</span>
            <span className="zs-faq__sign" aria-hidden="true">
              +
            </span>
          </button>
          {open === i ? (
            <p id={`${id}-a${i}`} className="zs-faq__a zs-pop">
              {f.a}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
