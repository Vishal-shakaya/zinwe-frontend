import type { CSSProperties, ReactElement } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";

/** Trimmed wordmark proportions (public/brand/zinwe-logo.png, 837 x 206). */
const LOGO_ASPECT = 837 / 206;

interface BrandProps {
  /** "link" (default) renders a home link; "static" a plain span (decorative use). */
  variant?: "link" | "static";
  /** Link target (default "/"). */
  to?: string;
  ariaLabel?: string;
  /** "dark" lettering for light surfaces (default); "light" lettering for ink backgrounds. */
  tone?: "dark" | "light";
  /** Display height in px (the files cover 1x/2x/3x up to 32px). */
  height?: number;
  className?: string;
}

/**
 * The Zinwe wordmark: the founder's original logo (orange Z, grey "inwe"),
 * background removed and served as WebP with a PNG fallback.
 * Regenerate the files with design/brand/make_brand.py.
 */
export function Brand({
  variant = "link",
  to = "/",
  ariaLabel,
  tone = "dark",
  height = 28,
  className,
}: BrandProps): ReactElement {
  const base = tone === "light" ? "/brand/zinwe-logo-light" : "/brand/zinwe-logo";
  const set = (ext: string) => `${base}-32.${ext} 1x, ${base}-64.${ext} 2x, ${base}-96.${ext} 3x`;
  const style = { "--brand-h": `${height}px` } as CSSProperties;

  const logo = (
    <picture>
      <source type="image/webp" srcSet={set("webp")} />
      <img
        className="brand__logo"
        src={`${base}-64.png`}
        srcSet={set("png")}
        width={Math.round(height * LOGO_ASPECT)}
        height={height}
        alt="Zinwe"
        decoding="async"
      />
    </picture>
  );

  if (variant === "static") {
    return (
      <span className={cx("brand", className)} style={style}>
        {logo}
      </span>
    );
  }
  return (
    <Link className={cx("brand", className)} to={to} aria-label={ariaLabel} style={style}>
      {logo}
    </Link>
  );
}
