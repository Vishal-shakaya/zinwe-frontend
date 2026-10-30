import type { ReactElement } from "react";

/** The phone Filters sheet's contents (DashActivity): Day (three days + any date), then Show. */
export function SheetBody({
  days,
  day,
  earliest,
  today,
  onDay,
  filters,
  onFilter,
}: {
  days: readonly { day: string; label: string; tip: string; on: boolean }[];
  day: string;
  earliest: string | undefined;
  today: string;
  onDay: (day: string) => void;
  filters: readonly { key: "all" | "ok"; label: string; n: number; on: boolean }[];
  onFilter: (key: "all" | "ok") => void;
}): ReactElement {
  return (
    <>
      <span className="za-lbl">Day</span>
      {days.map((o) => (
        <button key={o.day} type="button" className="zt-opt" aria-pressed={o.on} onClick={() => onDay(o.day)}>
          <span>{o.label}</span>
          <span className="za-optdate">{o.tip}</span>
        </button>
      ))}
      <label className="zt-opt za-optpick">
        <span>Pick a date</span>
        <input type="date" value={day} min={earliest} max={today} onChange={(e) => e.target.value && onDay(e.target.value)} />
      </label>
      <span className="za-lbl" style={{ marginTop: 4 }}>
        Show
      </span>
      {filters.map((f) => (
        <button key={f.key} type="button" className="zt-opt" aria-pressed={f.on} onClick={() => onFilter(f.key)}>
          <span>{f.label}</span>
          <span className="z-num" style={{ color: "#6B6B6B" }}>
            {f.n}
          </span>
        </button>
      ))}
    </>
  );
}
