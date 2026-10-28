import { useState, type ReactElement, type ReactNode } from "react";
import { TipBody } from "../ui/Tooltip";
import type { Tip } from "../ui/useTip";

/** The board's switch (44 × 26, green when on). */
export function Toggle({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: () => void; disabled?: boolean }): ReactElement {
  return (
    <button type="button" className="rl-toggle" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange}>
      <span />
    </button>
  );
}

/** A setting row: bold title, grey line under it, switch on the right. */
export function SwitchRow({
  title,
  sub,
  on,
  label,
  onChange,
  divided,
}: {
  title: string;
  sub: string;
  on: boolean;
  label: string;
  onChange: () => void;
  divided?: boolean;
}): ReactElement {
  return (
    <div
      className="rl-row"
      style={{ display: "flex", gap: 14, alignItems: "flex-start", justifyContent: "space-between", ...(divided ? { borderTop: "1px solid #F0EDE6", paddingTop: 14 } : {}) }}
    >
      <span>
        <b>{title}</b>
        <br />
        <span className="rl-k">{sub}</span>
      </span>
      <Toggle on={on} label={label} onChange={onChange} />
    </div>
  );
}

/** A radio card (USB, Websites): orange ring when picked. */
export function OptCard({ on, label, desc, onPick }: { on: boolean; label: string; desc: string; onPick: () => void }): ReactElement {
  return (
    <button type="button" role="radio" aria-checked={on} className={`rl-opt${on ? " on" : ""}`} onClick={onPick}>
      <span className="rl-radio" aria-hidden="true" />
      <span>
        <b>{label}</b>
        <br />
        <span style={{ fontSize: 13, color: "#4A443C" }}>{desc}</span>
      </span>
    </button>
  );
}

/** The (i) button next to a heading: the shared tooltip on hover, focus and tap. */
export function Def({ tip, id, aria, children }: { tip: Tip; id: string; aria: string; children: ReactNode }): ReactElement {
  return (
    <button type="button" className="rl-defb" aria-label={aria} {...tip.anchor(id, <TipBody text={children} />)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    </button>
  );
}

/**
 * One card section with its jump-list anchor. On a phone it is an accordion (header button + body); on a desktop
 * the header button is hidden and every body shows.
 */
export function Section({
  id,
  label,
  title,
  sub,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  /** Heading (may hold a Def button); defaults to the label. */
  title?: ReactNode;
  sub: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <section id={id} className="z-card rl-sec" aria-labelledby={`${id}-t`}>
      <button type="button" className="rl-acc-h" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
        {label}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flex: "none", transition: "transform .15s", transform: `rotate(${open ? 180 : 0}deg)` }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div id={`${id}-body`} className={open ? "rl-acc-body" : "rl-acc-body shut"}>
        <div>
          <h2 id={`${id}-t`} className="rl-sec-t" style={{ margin: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
            {title ?? label}
          </h2>
          <span className="rl-k">{sub}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

function sizeText(bytes: number, unitBytes: number): string {
  return String(Number((bytes / unitBytes).toFixed(2)));
}

/**
 * A number box for a size limit kept in bytes. It shows MB or GB, lets the owner type freely, and reports a new
 * size only for a valid number (at least `min` of the unit).
 */
export function SizeField({
  id,
  label,
  bytes,
  unit,
  unitBytes,
  min,
  onChange,
}: {
  id: string;
  label: string;
  bytes: number;
  unit: "MB" | "GB";
  unitBytes: number;
  min: number;
  onChange: (bytes: number) => void;
}): ReactElement {
  const [text, setText] = useState(() => sizeText(bytes, unitBytes));
  const [seen, setSeen] = useState(bytes);
  if (seen !== bytes) {
    // Discard / a save from elsewhere: show the new size unless it is what the box already says.
    setSeen(bytes);
    if (Math.round(Number(text) * unitBytes) !== bytes) setText(sizeText(bytes, unitBytes));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontWeight: 600 }}>
        {label}
      </label>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          id={id}
          type="number"
          min={min}
          step={unit === "GB" ? "any" : 1}
          inputMode="decimal"
          className="rl-inp rl-num"
          style={{ width: 110 }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(v) && v >= min) onChange(Math.round(v * unitBytes));
          }}
          onBlur={() => setText(sizeText(bytes, unitBytes))}
        />
        <span>{unit}</span>
      </span>
    </div>
  );
}
