import { useCallback, useId, useState, type FocusEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { TipLayer, type TipOpen } from "./Tooltip";

/**
 * The one tooltip (shared standard, boards' `.zn-tt`): white card above its anchor with a 6 px arrow, flips
 * below when there is no room, kept inside the screen. Opens on hover and on keyboard focus; Escape closes.
 *
 *   const tip = useTip();
 *   <a {...tip.anchor("tile-alerts", <TipBody title="Needs you" text="…" />)}>…</a>
 *   {tip.node}
 */


export interface AnchorProps {
  "aria-describedby": string | undefined;
  onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

export interface Tip {
  anchor: (key: string, content: ReactNode, opts?: { wide?: boolean }) => AnchorProps;
  /** Show a tip at an arbitrary rectangle (charts: the hovered bar). */
  showAt: (key: string, content: ReactNode, rect: DOMRect, opts?: { wide?: boolean }) => void;
  hide: () => void;
  node: ReactElement | null;
}

export function useTip(): Tip {
  const base = useId();
  const [open, setOpen] = useState<TipOpen | null>(null);
  const hide = useCallback(() => setOpen(null), []);
  const showAt = useCallback(
    (key: string, content: ReactNode, rect: DOMRect, opts?: { wide?: boolean }) =>
      setOpen({ key, content, rect, wide: !!opts?.wide }),
    [],
  );

  const anchor = (key: string, content: ReactNode, opts?: { wide?: boolean }): AnchorProps => {
    const show = (el: HTMLElement) => {
      // The board marks the exact spot to point at with data-tip-at (e.g. the label, not the whole tile).
      const at = (el.querySelector("[data-tip-at]") as HTMLElement | null) ?? el;
      setOpen({ key, content, rect: at.getBoundingClientRect(), wide: !!opts?.wide });
    };
    return {
      "aria-describedby": open?.key === key ? `${base}-${key}` : undefined,
      onMouseEnter: (e) => show(e.currentTarget),
      onMouseLeave: hide,
      onFocus: (e) => show(e.currentTarget),
      onBlur: hide,
    };
  };

  return {
    anchor,
    showAt,
    hide,
    node: open ? <TipLayer id={`${base}-${open.key}`} open={open} onClose={hide} /> : null,
  };
}
