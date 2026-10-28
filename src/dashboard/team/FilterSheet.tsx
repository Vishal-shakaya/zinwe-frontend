import { useEffect, useRef, type ReactElement, type ReactNode } from "react";

/**
 * The phone filter sheet (DashTeam "Show", DashActivity "Filters"): grab bar, title + Done, then the choices.
 * Only rendered on phones (CSS); Escape and the scrim close it and focus goes back to its button.
 */
export function FilterSheet({
  id,
  title,
  open,
  onClose,
  returnTo,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  /** Id of the button that opened it. */
  returnTo: string;
  children: ReactNode;
}): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? root?.querySelector<HTMLElement>("button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.setTimeout(() => document.getElementById(returnTo)?.focus(), 0);
    };
  }, [open, onClose, returnTo]);
  if (!open) return null;
  return (
    <div className="zt-sheet-wrap">
      <button type="button" className="zt-sheet-scrim" aria-label="Close filters" tabIndex={-1} onClick={onClose} />
      <div ref={ref} id={id} className="zt-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-h`}>
        <span className="zt-grab" aria-hidden="true" />
        <div className="zt-sheet__head">
          <h2 id={`${id}-h`}>{title}</h2>
          <button type="button" className="z-btn sm" onClick={onClose}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
