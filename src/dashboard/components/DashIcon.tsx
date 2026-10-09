import type { ReactElement } from "react";

/** Stroke icons for the dashboard (24px grid, currentColor). */
export type DashIconName =
  | "pc"
  | "shield"
  | "activity"
  | "logout"
  | "copy"
  | "check"
  | "refresh"
  | "usb"
  | "key"
  | "alert"
  | "arrow";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function paths(name: DashIconName): ReactElement {
  switch (name) {
    case "pc":
      return (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case "activity":
      return <path d="M3 12h4l3-8 4 16 3-8h4" />;
    case "logout":
      return (
        <>
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
          <path d="M10 8 6 12l4 4M6 12h10" />
        </>
      );
    case "copy":
      return (
        <>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
        </>
      );
    case "check":
      return <path d="m5 12 5 5L20 7" />;
    case "refresh":
      return (
        <>
          <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" />
          <path d="M20 20v-4h-4" />
        </>
      );
    case "usb":
      return (
        <>
          <rect x="7" y="10" width="10" height="11" rx="2" />
          <path d="M9 10V4h6v6M11 6.5h.01M13 6.5h.01" />
        </>
      );
    case "key":
      return (
        <>
          <circle cx="8" cy="15" r="4" />
          <path d="m11 12 9-9M17 6l3 3M14 9l2 2" />
        </>
      );
    case "alert":
      return (
        <>
          <path d="M12 3 2 20h20z" />
          <path d="M12 10v4M12 17h.01" />
        </>
      );
    case "arrow":
      return <path d="M5 12h14M13 6l6 6-6 6" />;
  }
}

export function DashIcon({ name }: { name: DashIconName }): ReactElement {
  return (
    <svg className="dash-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeProps}>
      {paths(name)}
    </svg>
  );
}
