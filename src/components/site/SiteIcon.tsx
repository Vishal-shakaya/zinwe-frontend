import type { CSSProperties, ReactElement } from "react";

/** The prototype's line icons (24 × 24, round caps), drawn from one or more path strings. */
export function PathIcon({
  d,
  size = 18,
  stroke = 2,
  className,
  style,
}: {
  d: string | readonly string[];
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}): ReactElement {
  const paths = typeof d === "string" ? [d] : d;
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

const TICK = "M20 6 9 17l-5-5";
const CROSS = "M6 6l12 12M18 6 6 18";

/** The green tick the boards put before every promise. */
export function Tick({ size = 18, stroke = 2.6, className = "zs-tick" }: { size?: number; stroke?: number; className?: string }): ReactElement {
  return <PathIcon d={TICK} size={size} stroke={stroke} className={className} />;
}

export function Cross({ size = 13, stroke = 2.6, className = "zs-cross" }: { size?: number; stroke?: number; className?: string }): ReactElement {
  return <PathIcon d={CROSS} size={size} stroke={stroke} className={className} />;
}

/** Pause / play glyphs (filled), for the buttons that stop moving content. */
export function PauseGlyph({ size = 12 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
    </svg>
  );
}

export function PlayGlyph({ size = 12 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

