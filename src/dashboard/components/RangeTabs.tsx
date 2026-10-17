import type { ReactElement } from "react";
import { cx } from "../../lib/cx";
import { useEntitlements } from "../features/entitlements";
import { useUpgrade } from "../features/upgrade";
import { DashIcon } from "./DashIcon";

interface RangeOption {
  days: number;
  label: string;
}

const RANGE_OPTIONS: readonly RangeOption[] = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

/**
 * A small segmented control that picks the metrics window (days). A range longer than the plan's history
 * (e.g. 30 days on Free's 7) shows a lock and opens the plan page instead.
 */
export function RangeTabs({ value, onChange }: { value: number; onChange: (days: number) => void }): ReactElement {
  const { historyDays } = useEntitlements();
  const upgrade = useUpgrade();
  return (
    <div className="dash-range" role="group" aria-label="Choose a time range">
      {RANGE_OPTIONS.map((option) => {
        const locked = historyDays > 0 && option.days > historyDays;
        return (
          <button
            key={option.days}
            type="button"
            className={cx("dash-range__btn", value === option.days && "is-on", locked && "is-locked")}
            aria-pressed={value === option.days}
            title={locked ? `Your plan keeps ${historyDays} days of history. Upgrade to see ${option.label}.` : undefined}
            onClick={() => (locked ? upgrade.open() : onChange(option.days))}
          >
            {locked ? <DashIcon name="lock" /> : null}
            {option.label}
            {locked ? <span className="dash-sr"> (upgrade to see)</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default RangeTabs;
