/**
 * "Everyone / one team member" for the protection pages' analytics. The choice lives in the URL
 * (`?member=<id>`, so it can be shared and survives a reload) and is remembered for the browser tab, so
 * moving between Online protection, Data safety and App monitoring keeps the same person selected.
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "zinwe.analytics.member";

function remembered(): number | null {
  try {
    const n = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function remember(id: number | null): void {
  try {
    if (id === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* storage blocked: the URL still carries the choice */
  }
}

export function useMemberFilter(): { member: number | null; setMember: (id: number | null) => void } {
  const [params, setParams] = useSearchParams();
  const fromUrl = Number(params.get("member"));
  const member = Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : params.has("member") ? null : remembered();

  const setMember = useCallback(
    (id: number | null) => {
      remember(id);
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id === null) next.delete("member");
          else next.set("member", String(id));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { member, setMember };
}

/** "last 7 days" for a range in days. */
export function rangeLabel(days: number): string {
  return days <= 1 ? "last 24 hours" : `last ${days} days`;
}
