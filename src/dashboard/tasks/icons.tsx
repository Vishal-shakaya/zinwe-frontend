import type { ReactElement } from "react";

/** Board icons that are more than one path (ZIcon draws a single path). Decorative: aria-hidden. */

const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The task mark: a rounded square with a tick (DashChat composer, slash menu, task cards). */
export function TaskMark({ size = 16, stroke = 2.2 }: { size?: number; stroke?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={stroke} aria-hidden="true" style={{ flex: "none" }}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function CalendarMark(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth={2} aria-hidden="true" style={{ flex: "none" }}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function BoardMark(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth={2.2} aria-hidden="true" style={{ flex: "none" }}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </svg>
  );
}

export function ClockMark(): ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" {...base} strokeWidth={2.4} aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SearchMark(): ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
