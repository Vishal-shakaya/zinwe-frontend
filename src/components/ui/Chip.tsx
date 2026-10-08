import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cx } from "../../lib/cx";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
}

/** Pill-shaped button; `on` renders the filled (selected) state. */
export function Chip({ on = false, className, type = "button", ...rest }: ChipProps): ReactElement {
  return <button type={type} className={cx("chip", on && "chip--on", className)} {...rest} />;
}
