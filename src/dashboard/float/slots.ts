/**
 * DashFloat's one floating corner (bottom-right): the docked chat windows on the left, then a column with the open
 * panel, toasts and the round buttons (Chat, Support). AppLayout renders ChatLauncher, SupportWidget, ChatBubble and
 * page Toasts as separate components, so each one portals into its slot of this shared box; the flex layout then
 * places them exactly as the board does (Chat moves right when Support is hidden, windows dock beside the column).
 *
 *   div.zf-wrap
 *     div.zf-dock            ← chat windows (ChatBubble)
 *     div.zf-col
 *       div.zf-slot          ← the open panel (Chat list or Support)
 *       div.zf-toasts        ← toasts (Toast, the Support "hidden" note)
 *       div.zf-fabs
 *         div.zf-slot        ← Chat button
 *         div.zf-slot        ← Support button
 */
import { useEffect, useSyncExternalStore } from "react";

export type FloatSlot = "dock" | "panel" | "toast" | "chat" | "support";

let root: HTMLDivElement | null = null;
let users = 0;
const slots = new Map<FloatSlot, HTMLElement>();

function div(className: string, parent: HTMLElement): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  parent.appendChild(el);
  return el;
}

function build(): void {
  root = document.createElement("div");
  root.className = "zf-wrap";
  // Private screens stay masked if Microsoft Clarity ever records the dashboard (as on AppLayout's root).
  root.setAttribute("data-clarity-mask", "true");
  slots.set("dock", div("zf-dock", root));
  const col = div("zf-col", root);
  slots.set("panel", div("zf-slot", col));
  slots.set("toast", div("zf-toasts", col));
  const fabs = div("zf-fabs", col);
  slots.set("chat", div("zf-slot", fabs));
  slots.set("support", div("zf-slot", fabs));
  document.body.appendChild(root);
}

function teardown(): void {
  root?.remove();
  root = null;
  slots.clear();
}

const listeners = new Set<() => void>();

/* Subscribing holds the box (built on the first subscriber, removed with the last: signed out / left the dashboard). */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  users += 1;
  if (!root) {
    build();
    listeners.forEach((l) => l());
  }
  return () => {
    listeners.delete(listener);
    users -= 1;
    if (users === 0) teardown();
  };
}

/** The element to portal into (null on the first render, and outside the browser). */
export function useFloatSlot(name: FloatSlot): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => slots.get(name) ?? null,
    () => null,
  );
}

/** True when `target` is inside the floating corner (a click there doesn't count as "outside" a panel). */
export function inFloat(target: EventTarget | null): boolean {
  return Boolean(root && target instanceof Node && root.contains(target));
}

/* Only one panel at a time: opening Chat closes Support and the other way round (board: toggleChat / toggleSup). */
const PANEL_EVENT = "zinwe:float-panel";
export type FloatPanel = "chat" | "support";

export function announcePanel(which: FloatPanel): void {
  window.dispatchEvent(new CustomEvent<FloatPanel>(PANEL_EVENT, { detail: which }));
}

/** Calls `close` when the other panel opens. */
export function useOtherPanel(mine: FloatPanel, close: () => void): void {
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<FloatPanel>).detail !== mine) close();
    };
    window.addEventListener(PANEL_EVENT, on);
    return () => window.removeEventListener(PANEL_EVENT, on);
  }, [mine, close]);
}

/** Esc closes an open panel wherever focus is (its button, the page), except inside a chat window, which has its own. */
export function usePanelEscape(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest(".zf-win, dialog[open]")) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
}
