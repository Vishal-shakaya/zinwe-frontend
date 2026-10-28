/**
 * The docked chat windows (DashFloat `wins`): side by side like LinkedIn, newest on the right (nearest the list),
 * at most 3 open; opening a 4th closes the oldest. Each window is one ChatBubbleRequest. A module store, because
 * AppLayout keeps only the latest request and remounts ChatBubble when the person changes.
 */
import { useSyncExternalStore } from "react";
import type { ChatBubbleRequest } from "../features/chatBubble";

export interface DockWin {
  /** One window per person. */
  key: string;
  request: ChatBubbleRequest;
  min: boolean;
}

export const MAX_WINS = 3;

let wins: readonly DockWin[] = [];
const listeners = new Set<() => void>();

function set(next: readonly DockWin[]): void {
  wins = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDock(): readonly DockWin[] {
  return useSyncExternalStore(
    subscribe,
    () => wins,
    () => wins,
  );
}

/** Open (or bring back, expanded and newest) the window for this request's person. */
export function openWin(request: ChatBubbleRequest): void {
  const key = String(request.person.id);
  const current = wins.find((w) => w.key === key);
  if (current && current.request === request) return;
  set([...wins.filter((w) => w.key !== key), { key, request, min: false }].slice(-MAX_WINS));
}

/** Close one window; returns how many are left. */
export function closeWin(key: string): number {
  set(wins.filter((w) => w.key !== key));
  return wins.length;
}

export function setWinMin(key: string, min: boolean): void {
  set(wins.map((w) => (w.key === key ? { ...w, min } : w)));
}

/* Cleared when no ChatBubble is mounted any more (closed, or the Chat page opened). A remount for a new person
   happens in the same commit, so the check waits a tick. */
let holders = 0;

export function holdDock(): () => void {
  holders += 1;
  return () => {
    holders -= 1;
    window.setTimeout(() => {
      if (holders === 0 && wins.length) set([]);
    }, 0);
  };
}
