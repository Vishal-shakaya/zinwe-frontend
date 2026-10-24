import { useCallback } from "react";
import { getEventCounts, type EventCounts } from "../../lib/api";
import { useResource, type Resource } from "../useResource";

/**
 * The account's alert totals, counted on the server (GET /events/counts/, FIX-013), so a busy account's numbers
 * don't stop at whatever the events feed returned. All PCs, the plan's history window; confirmations excluded.
 * Non-critical: a failure just leaves `data` undefined and the totals line hidden.
 */
export function useEventCounts(): Resource<EventCounts> {
  const load = useCallback((signal: AbortSignal) => getEventCounts(signal), []);
  return useResource(load, { pollMs: 60_000 });
}
