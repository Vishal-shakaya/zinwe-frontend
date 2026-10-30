import type { ReactElement } from "react";
import { FREE_LABEL } from "../../content/site/resources";

/**
 * A guide's cover drawn as a book: spine shading, a sheen and a block of page edges (all CSS, resources.css).
 * The cover art is the guide's own image (600 × 849); the box keeps that ratio, so nothing moves when it loads.
 */
export function Book({
  src,
  alt,
  size = "md",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}): ReactElement {
  return (
    <span className={`zrs-book zrs-book--${size}`}>
      <span className="zrs-book__cover">
        {src ? (
          <img
            src={src}
            alt={alt}
            width={600}
            height={849}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
        ) : null}
      </span>
    </span>
  );
}

/** "Free · 2026": the only price text in the library. */
export function FreeLabel({ className = "" }: { className?: string }): ReactElement {
  return <span className={`zrs-free-label ${className}`.trim()}>{FREE_LABEL}</span>;
}
