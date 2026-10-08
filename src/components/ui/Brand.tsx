import type { ReactElement } from "react";
import { Link } from "react-router-dom";

interface BrandProps {
  /** "link" (default) renders a home link; "static" a plain span (decorative use). */
  variant?: "link" | "static";
  ariaLabel?: string;
}

/** The ZINWE wordmark with its orange square dot. */
export function Brand({ variant = "link", ariaLabel }: BrandProps): ReactElement {
  const mark = (
    <>
      zinwe<span className="brand__dot"></span>
    </>
  );
  if (variant === "static") return <span className="brand">{mark}</span>;
  return (
    <Link className="brand" to="/" aria-label={ariaLabel}>
      {mark}
    </Link>
  );
}
