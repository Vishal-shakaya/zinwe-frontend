import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";
import { DashIcon, type DashIconName } from "./DashIcon";

export interface StatTile {
  value: string;
  label: string;
  /**
   * How serious the number is, shown as colour on the number and its icon:
   * good (green), warn (amber), bad (red). Default is neutral ink.
   */
  tone?: "good" | "warn" | "bad";
  /** Small icon beside the number, so tiles read at a glance. */
  icon?: DashIconName;
  /** What the number means, shown on hover/focus. */
  hint?: string;
  /** Where the tile leads (e.g. Alerts filtered to what it counts). */
  to?: string;
}

/** A row of summary numbers, reusing the dashboard's .dash-stats styling. */
export function StatTiles({
  tiles,
  label = "Summary",
  wide = false,
}: {
  tiles: StatTile[];
  label?: string;
  /** Auto-fits more than 3 tiles (e.g. a 5-up presence row). */
  wide?: boolean;
}): ReactElement {
  return (
    <ul className={cx("dash-stats", wide && "dash-stats--wide")} aria-label={label}>
      {tiles.map((tile) => {
        const body: ReactNode = (
          <>
            {tile.icon ? (
              <span className="dash-stats__ico" aria-hidden="true">
                <DashIcon name={tile.icon} />
              </span>
            ) : null}
            <b>{tile.value}</b>
            <span>{tile.label}</span>
            {tile.hint ? <span className="dash-sr">{tile.hint}</span> : null}
          </>
        );
        return (
          <li
            key={tile.label}
            className={cx(
              tile.tone === "good" && "is-good",
              tile.tone === "warn" && "is-warn",
              tile.tone === "bad" && "is-bad",
              tile.icon && "has-icon",
              tile.to && "is-link",
            )}
            data-tip={tile.hint}
            tabIndex={tile.hint && !tile.to ? 0 : undefined}
          >
            {tile.to ? (
              <Link className="dash-stats__link" to={tile.to}>
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default StatTiles;
