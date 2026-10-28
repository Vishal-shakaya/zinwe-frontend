import { useRef, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/settings.css";

export interface Section {
  key: string;
  label: string;
  /** The line under the row on a phone. */
  desc: ReactNode;
}

/**
 * Boards DashSettings + DashHelp: the section tabs (desktop, roving tabindex with arrow keys / Home / End),
 * the same sections as a row list on a phone, and the open section's back bar (phone). The page root carries
 * `zn-open` while one section is open on a phone; desktop ignores it.
 */
export function SectionNav({
  label,
  backLabel,
  sections,
  current,
  onPick,
  onBack,
  idPrefix,
  panelId,
}: {
  label: string;
  backLabel: string;
  sections: readonly Section[];
  current: string;
  /** A tab or a phone row was picked (opens that section). */
  onPick: (key: string) => void;
  /** Phone back arrow: back to the row list. */
  onBack: () => void;
  idPrefix: string;
  panelId: string;
}): ReactElement {
  const list = useRef<HTMLDivElement>(null);
  const curLabel = (sections.find((s) => s.key === current) ?? sections[0])?.label ?? "";

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = sections.length;
    const to =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    const key = sections[to]!.key;
    onPick(key);
    list.current?.querySelector<HTMLElement>(`#${idPrefix}${key}`)?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label={label} className="zp-tabs" ref={list}>
        {sections.map((s, i) => {
          const on = s.key === current;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              id={`${idPrefix}${s.key}`}
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              className={`zp-tab${on ? " on" : ""}`}
              onClick={() => onPick(s.key)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {/* Phone only: the tabs as a row list. Each row opens its section as its own screen. */}
      <nav className="zp-rows z-card" aria-label={`${label} sections`}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className="zp-row"
            onClick={() => {
              onPick(s.key);
              window.scrollTo(0, 0);
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="zp-row-t">{s.label}</span>
              <span className="zp-row-d">{s.desc}</span>
            </span>
            <ZIcon d="m9 6 6 6-6 6" size={18} />
          </button>
        ))}
      </nav>
      {/* Phone only: the open section's back bar. */}
      <div className="zp-back">
        <button
          type="button"
          className="zp-backbtn"
          aria-label={backLabel}
          onClick={() => {
            onBack();
            window.scrollTo(0, 0);
          }}
        >
          <ZIcon d="m15 6-6 6 6 6" size={22} />
        </button>
        <h1>{curLabel}</h1>
      </div>
    </>
  );
}
