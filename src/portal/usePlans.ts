import { useCallback } from "react";
import { useResource, type Resource } from "../dashboard/useResource";
import { getPlans, type Plan } from "../lib/api";

/** GET plans/ (public), loaded once per page. */
export function usePlans(): Resource<Plan[]> {
  const load = useCallback((signal: AbortSignal) => getPlans(signal), []);
  return useResource(load);
}
