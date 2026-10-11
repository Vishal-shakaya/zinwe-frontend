import type { ReactElement } from "react";
import { cx } from "../../lib/cx";

interface RangeOption {
  days: number;
  label: string;
}

const RANGE_OPTIONS: readonly RangeOption[] = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

/** A small segmented control that picks the metrics window (days). */
export function RangeTabs({ value, onChange }: { value: number; onChange: (days: number) => void }): ReactElement {
  return (
    <div className="dash-range" role="group" aria-label="Choose a time range">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.days}
          type="button"
          className={cx("dash-range__btn", value === option.days && "is-on")}
          aria-pressed={value === option.days}
          onClick={() => onChange(option.days)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default RangeTabs;
