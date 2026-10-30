import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ZIcon, type IconName } from "./ZIcon";

/** CompShimmer: a grey placeholder in the exact shape of what's coming. */
export function Sk({
  w = "100%",
  h = 12,
  round = false,
  style,
}: {
  w?: number | string;
  h?: number | string;
  round?: boolean;
  style?: CSSProperties;
}): ReactElement {
  return <span className={`z-sk${round ? " round" : ""}`} aria-hidden="true" style={{ width: w, height: h, ...style }} />;
}

/** Shimmer rows for a list card (avatar + two lines), with a screen-reader label. */
export function SkRows({ label, rows = 4, avatar = true }: { label: string; rows?: number; avatar?: boolean }): ReactElement {
  return (
    <div role="status" aria-live="polite" aria-busy="true" style={{ display: "flex", flexDirection: "column" }}>
      <span className="z-sr">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid #F5F5F5" : 0 }}>
          {avatar ? <Sk w={32} h={32} round /> : null}
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Sk w={`${58 - (i % 3) * 9}%`} h={12} />
            <Sk w={`${34 + (i % 2) * 12}%`} h={10} />
          </span>
          <Sk w={64} h={26} style={{ borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

/** Shimmer stat tiles (Overview, Protection pages). */
export function SkTiles({ count = 4, label = "Loading numbers" }: { count?: number; label?: string }): ReactElement {
  return (
    <div role="status" aria-busy="true" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 20 }}>
      <span className="z-sr">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="z-card" style={{ padding: 16, minHeight: 104, display: "flex", flexDirection: "column", gap: 10 }}>
          <Sk w="55%" h={12} />
          <Sk w="40%" h={28} />
          <Sk w="70%" h={10} />
        </div>
      ))}
    </div>
  );
}

/** CompSpinner: 16 px in buttons/inline, 24 px for a card, 40 px for a page. Always comes with words. */
export function Spinner({
  size = 16,
  tone,
}: {
  size?: 16 | 24 | 40;
  tone?: "on-dark" | "on-orange";
}): ReactElement {
  const width = size === 16 ? 2 : size === 24 ? 2.5 : 3;
  return (
    <span
      className={`z-spin${tone ? ` ${tone}` : ""}`}
      aria-hidden="true"
      style={{ width: size, height: size, borderWidth: width }}
    />
  );
}

/** "Loading…" for a whole card or page: spinner + words. */
export function Busy({ label, size = 24 }: { label: string; size?: 16 | 24 | 40 }): ReactElement {
  return (
    <div className="zn-boot" role="status" aria-live="polite">
      <Spinner size={size} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyBlock({
  icon = "check",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}): ReactElement {
  return (
    <div className="z-state">
      <span className="z-state__mark">
        <ZIcon name={icon} />
      </span>
      <b>{title}</b>
      {children ? <span style={{ maxWidth: 420 }}>{children}</span> : null}
      {action ?? null}
    </div>
  );
}

export function ErrorBlock({
  title = "We couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}): ReactElement {
  return (
    <div className="z-state err" role="alert">
      <span className="z-state__mark">
        <ZIcon name="alerts" />
      </span>
      <b>{title}</b>
      <span style={{ maxWidth: 420 }}>{message}</span>
      {onRetry ? (
        <button type="button" className="z-btn sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * A small dialog on desktop, a bottom sheet on a phone (the boards' `.zn-sheet`). Escape and the scrim close it;
 * Tab stays inside; focus returns to whatever opened it.
 */
export function Sheet({
  open,
  title,
  sub,
  onClose,
  children,
  wide = false,
  labelledBy,
}: {
  open: boolean;
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  labelledBy?: string;
}): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>("textarea, input, select, button:not([data-x]), a[href]");
    (first ?? root)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea, input, select"));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      back?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  const headId = labelledBy ?? "zn-sheet-title";
  return (
    <div className="zn-sheet-wrap">
      <button type="button" className="zn-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={ref} className={`zn-dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={headId} tabIndex={-1}>
        <div className="zn-dialog-head">
          <div>
            <h2 id={headId}>{title}</h2>
            {sub ? <p>{sub}</p> : null}
          </div>
          <button type="button" className="z-x" aria-label="Close" data-x onClick={onClose}>
            <ZIcon name="close" size={16} stroke={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** One-line confirmation at the bottom (with an optional Undo). */
export function ZToast({ text, onUndo, onDone, ms = 4000 }: { text: string; onUndo?: () => void; onDone: () => void; ms?: number }): ReactElement {
  useEffect(() => {
    const id = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(id);
  }, [onDone, ms, text]);
  return (
    <div className="z-toast" role="status">
      <span>{text}</span>
      {onUndo ? (
        <button type="button" onClick={onUndo}>
          Undo
        </button>
      ) : null}
    </div>
  );
}
