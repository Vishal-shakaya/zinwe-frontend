/**
 * Loads the account policy once and hands back a `commit` that saves a partial
 * change and updates the cached copy in place. Shared by the Setup page and the
 * per-feature control panels, so every surface edits the same live policy.
 */
import { useCallback } from "react";
import { getPolicy, updatePolicy, type Policy, type PolicyUpdate } from "../../lib/api";
import { useResource, type Resource } from "../useResource";

export type CommitPolicy = (patch: PolicyUpdate) => Promise<Policy>;

export interface PolicyController {
  policy: Resource<Policy>;
  commit: CommitPolicy;
}

export function usePolicy(): PolicyController {
  const load = useCallback((signal: AbortSignal) => getPolicy(signal), []);
  const policy = useResource<Policy>(load);

  const commit = useCallback<CommitPolicy>(
    async (patch) => {
      const next = await updatePolicy(patch);
      policy.setData(next);
      return next;
    },
    [policy],
  );

  return { policy, commit };
}
