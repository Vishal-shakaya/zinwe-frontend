import { useCallback } from "react";
import { useResource, type Resource } from "../dashboard/useResource";
import { getOffer, type Offer } from "../lib/api";

/** GET payments/offer/<id>/ for the plan it names; no plan = no offer. The order checks it all again. */
export function useOffer(id: number, planCode: string | null): Resource<Offer | null> {
  const load = useCallback((signal: AbortSignal): Promise<Offer | null> => (planCode ? getOffer(id, planCode, signal) : Promise.resolve(null)), [id, planCode]);
  return useResource(load, { resetKey: `${id}:${planCode ?? ""}` });
}
