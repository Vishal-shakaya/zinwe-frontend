import type { CSSProperties, ReactElement } from "react";
import { ICON, type IconName } from "./icons";

export type { IconName } from "./icons";



interface ZIconProps {
  /** A named icon, or… */
  name?: IconName;
  /** …a raw path straight from a board. */
  d?: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name; without it the icon is decorative. */
  label?: string;
}

export function ZIcon({ name, d, size = 18, stroke = 1.9, className, style, label }: ZIconProps): ReactElement {
  const path = d ?? (name ? ICON[name] : "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      className={className}
      style={{ flex: "none", ...style }}
    >
      <path d={path} />
    </svg>
  );
}
