import type { ReactElement } from "react";
import { cx } from "../../lib/cx";

export interface StatTile {
  value: string;
  label: string;
  /** Colours the number: good (green), warn (amber). Default is neutral ink. */
  tone?: "good" | "warn";
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
      {tiles.map((tile) => (
        <li key={tile.label} className={cx(tile.tone === "good" && "is-good", tile.tone === "warn" && "is-warn")}>
          <b>{tile.value}</b>
          <span>{tile.label}</span>
        </li>
      ))}
    </ul>
  );
}

export default StatTiles;
