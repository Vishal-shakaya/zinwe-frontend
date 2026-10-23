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
  | "arrow"
  | "clock"
  | "home"
  | "card"
  | "wallet"
  | "building"
  | "globe"
  | "swap"
  | "screen"
  | "share"
  | "team"
  | "chat"
  | "close"
  | "settings"
  | "help"
  | "lock"
  | "more"
  | "plus"
  | "book"
  | "back"
  | "phone"
  | "upload"
  | "download"
  | "mail"
  | "file"
  | "send"
  | "grid"
  | "chevron"
  | "qr"
  | "bell"
  | "calendar"
  | "user";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function paths(name: DashIconName): ReactElement {
  switch (name) {
    case "calendar":
      return (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M9 3v4M15 3v4M8 14h2M14 14h2M8 17h2" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </>
      );
    case "qr":
      return (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <path d="M14 14h2v2h-2zM18 14h2M14 20h2M18 18v2h2" />
        </>
      );
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
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case "home":
      return (
        <>
          <path d="m3 11 9-7 9 7" />
          <path d="M5 10v10h14V10M10 20v-6h4v6" />
        </>
      );
    case "card":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </>
      );
    case "wallet":
      return (
        <>
          <path d="M4 7a2 2 0 0 1 2-2h11v4" />
          <path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z" />
          <path d="M16 14.5h1.5" />
        </>
      );
    case "building":
      return (
        <>
          <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18" />
          <path d="M8 8h3M8 12h3M8 16h3" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </>
      );
    case "swap":
      return <path d="M7 7h11l-3-3M17 17H6l3 3" />;
    case "share":
      return (
        <>
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
        </>
      );
    case "screen":
      return (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <circle cx="12" cy="10.5" r="2.5" />
        </>
      );
    case "team":
      return (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
        </>
      );
    case "chat":
      return (
        <>
          <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z" />
          <path d="M9 11h6M9 14h4" />
        </>
      );
    case "close":
      return <path d="M6 6l12 12M18 6L6 18" />;
    case "settings":
      return (
        <>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2.2" />
          <circle cx="8" cy="17" r="2.2" />
        </>
      );
    case "help":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7" />
          <path d="M12 17.2h.01" />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </>
      );
    case "more":
      return <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={3} />;
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "book":
      return (
        <>
          <path d="M4.5 5.5A2 2 0 0 1 6.5 4H19v13H6.5a2 2 0 0 0-2 2V5.5z" />
          <path d="M4.5 19a2 2 0 0 0 2 2H19v-4M9 8h6" />
        </>
      );
    case "back":
      return <path d="M19 12H5M11 6l-6 6 6 6" />;
    case "grid":
      // Overview: the dashboard's tiles (the house icon is the website's Home).
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      );
    case "user":
      // Profile: one person.
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
      );
    case "chevron":
      // Up and down: "this opens a menu".
      return <path d="m8 10 4-4 4 4M8 14l4 4 4-4" />;
    case "phone":
      return (
        <>
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </>
      );
    case "upload":
      return <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />;
    case "download":
      return <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />;
    case "send":
      // Paper plane: the "send message" button.
      return <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z" />;
    case "mail":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </>
      );
  }
}

export function DashIcon({ name }: { name: DashIconName }): ReactElement {
  return (
    <svg className="dash-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeProps}>
      {paths(name)}
    </svg>
  );
}
