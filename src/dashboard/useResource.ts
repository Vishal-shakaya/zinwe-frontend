import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "../lib/api";

export interface Resource<T> {
  /** Last good data. Kept while a refresh runs or fails. */
  data: T | undefined;
  /** Error from the most recent attempt; cleared by the next success. */
  error: unknown;
  /** A request is in flight (first load or refresh). */
  pending: boolean;
  /** Fetch again now. */
  reload: () => void;
  /** Replace the data locally, e.g. with the response of a save. */
  setData: (data: T) => void;
}

interface State<T> {
  data: T | undefined;
  error: unknown;
  pending: boolean;
}

interface Options {
  /** Refetch on this interval while the tab is visible. */
  pollMs?: number;
  /**
   * When this value changes, the old data is dropped before the next load, so
   * a page never shows results for the wrong filter while new ones arrive.
   * Other changes to `load` (e.g. a bigger page size) keep the old data on screen.
   */
  resetKey?: string | number;
}

/**
 * Loads `load` and keeps it fresh. Pass a stable function (useCallback); it
 * runs again whenever its identity changes, on reload(), and on every poll.
 */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { pollMs, resetKey }: Options = {},
): Resource<T> {
  const [state, setState] = useState<State<T>>({ data: undefined, error: undefined, pending: true });
  const [tick, setTick] = useState(0);
  const lastResetKey = useRef(resetKey);

  useEffect(() => {
    const controller = new AbortController();
    const changed = lastResetKey.current !== resetKey;
    lastResetKey.current = resetKey;
    setState((s) =>
      changed ? { data: undefined, error: undefined, pending: true } : s.pending ? s : { ...s, pending: true },
    );

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: undefined, pending: false });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState((s) => ({ data: s.data, error, pending: false }));
      },
    );
    return () => controller.abort();
  }, [load, tick, resetKey]);

  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: undefined, pending: false }), []);

  return { ...state, reload, setData };
}
