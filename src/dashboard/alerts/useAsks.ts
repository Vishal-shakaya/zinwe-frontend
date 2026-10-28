import { useCallback, useEffect } from "react";
import { markEventHandled, type DeviceEvent } from "../../lib/api";
import { ASKS_CHANGED_EVENT, listAsks, type AlertAsks } from "../fixtures/majorAlerts";
import { useResource, type Resource } from "../useResource";

/** Which alerts the owner already asked about (FR-35 sample), kept in step across Overview and Alerts. */
export function useAsks(): Resource<AlertAsks> {
  const load = useCallback((signal: AbortSignal) => listAsks(signal), []);
  const asks = useResource(load);
  const { reload } = asks;
  useEffect(() => {
    window.addEventListener(ASKS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(ASKS_CHANGED_EVENT, reload);
  }, [reload]);
  return asks;
}

/** Mark every event of a row (or a selection) as fine — or open them again. A few requests at a time. */
export async function markMany(ids: readonly number[], handled: boolean): Promise<DeviceEvent[]> {
  const out: DeviceEvent[] = [];
  for (let i = 0; i < ids.length; i += 6) {
    const chunk = await Promise.all(ids.slice(i, i + 6).map((id) => markEventHandled(id, handled)));
    out.push(...chunk);
  }
  return out;
}
