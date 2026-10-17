import { cloneElement, type ReactElement, type SVGProps } from "react";

/** Inline SVG icons lifted verbatim from the static HTML. */
export type IconName =
  | "transfer"
  | "remote"
  | "install"
  | "lan"
  | "email"
  | "usb"
  | "globe"
  | "clock"
  | "check"
  | "windows"
  | "linux"
  | "macos";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

interface IconProps {
  name: IconName;
  /** Only used by stroke icons; defaults to 1.8 (3 for "check"). */
  strokeWidth?: number;
}

/** Every icon is decorative (the text beside it says what it is): hidden from screen readers and search engines. */
export function Icon(props: IconProps): ReactElement {
  return cloneElement(drawIcon(props), { "aria-hidden": true, focusable: "false" });
}

function drawIcon({ name, strokeWidth }: IconProps): ReactElement<SVGProps<SVGSVGElement>> {
  const sw = strokeWidth ?? (name === "check" ? 3 : 1.8);
  switch (name) {
    case "transfer":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <rect x="4" y="15" width="16" height="6" rx="2" />
        </svg>
      );
    case "remote":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
          <path d="m9 8 3 2-3 2M14 12h2" />
        </svg>
      );
    case "install":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <path d="M12 2v6" />
          <path d="m9 5 3 3 3-3" />
          <path d="M5 12h14l-1.5 9h-11z" />
        </svg>
      );
    case "lan":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v5M12 12l-5.5 5.5M12 12l5.5 5.5" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "usb":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <rect x="7" y="9" width="10" height="13" rx="2" />
          <path d="M9 9V3h6v6M11 5.5h.01M13 5.5h.01" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <path d="m5 12 5 5L20 7" />
        </svg>
      );
    case "windows":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5.5 11 4.4v7.1H3zM12 4.2 21 3v8.5h-9zM3 12.5h8v7.1L3 18.5zM12 12.5h9V21l-9-1.2z" />
        </svg>
      );
    case "linux":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <path d="M12 3c-2.5 0-4 2-4 5 0 1.5-.5 2.5-1.5 4S5 15.5 5 17c0 2 1.5 3 3 3h8c1.5 0 3-1 3-3 0-1.5-.5-3.5-1.5-5S16 9.5 16 8c0-3-1.5-5-4-5z" />
          <path d="M10 9h.01M14 9h.01" />
        </svg>
      );
    case "macos":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} strokeWidth={sw}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
  }
}
