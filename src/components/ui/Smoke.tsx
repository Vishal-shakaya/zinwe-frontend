import { useRef, type CSSProperties, type ReactElement } from "react";
import { useInView } from "../../hooks/useInView";
import { cx } from "../../lib/cx";

interface Wisp {
  /** Horizontal start, % of the host width. */
  x: number;
  /** Wisp width in px (height follows the aspect ratio in CSS). */
  size: number;
  /** Seconds for one rise. */
  dur: number;
  /** Seconds; negative so the loop starts mid-flight, not empty. */
  delay: number;
  /** Sideways drift in px over the rise. */
  sway: number;
  /** Orange-tinted wisp (the Zin's ember) instead of plain smoke. */
  ember?: boolean;
}

// Hand-placed rather than random so renders are stable and the text column
// stays mostly clear: heavier at the edges, one faint ember in the middle.
const WISPS: Wisp[] = [
  { x: 2, size: 340, dur: 19, delay: -4, sway: 60 },
  { x: 14, size: 260, dur: 23, delay: -15, sway: -40, ember: true },
  { x: 44, size: 300, dur: 27, delay: -9, sway: 30, ember: true },
  { x: 74, size: 280, dur: 21, delay: -12, sway: -50 },
  { x: 86, size: 360, dur: 25, delay: -2, sway: 40, ember: true },
];

interface SmokeProps {
  /** "light" = warm grey smoke on white; "dark" = pale smoke on ink. */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Ambient "Zin" smoke: soft wisps that rise, curl and fade behind a section.
 * Decorative only. Animates transform/opacity, pauses off-screen, and
 * freezes into a still haze under prefers-reduced-motion (CSS).
 * The host element needs the `zin-host` class.
 */
export function Smoke({ tone = "light", className }: SmokeProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);

  return (
    <div ref={ref} className={cx("zin-smoke", `zin-smoke--${tone}`, !visible && "is-paused", className)} aria-hidden="true">
      {WISPS.map((w, i) => (
        <span
          key={i}
          className={cx("zin-smoke__wisp", w.ember && "zin-smoke__wisp--ember")}
          style={
            {
              "--x": `${w.x}%`,
              "--s": `${w.size}px`,
              "--d": `${w.dur}s`,
              "--delay": `${w.delay}s`,
              "--sway": `${w.sway}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
