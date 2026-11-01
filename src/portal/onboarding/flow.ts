import { createContext, useContext, useLayoutEffect } from "react";

/** Where the owner is in choosing and paying: the onboarding header's stepper shows it. */
export interface PlanFlow {
  /** On a plan already (upgrading or renewing): Choose plan, Pay, Done. Otherwise the four registering steps. */
  upgrade: boolean;
  stage: "choose" | "pay" | "done";
}

export const PlanFlowContext = createContext<(flow: PlanFlow | null) => void>(() => undefined);

/**
 * Tells the header's stepper where this page is. A page says so itself because the account's step can't: paying
 * for a first plan moves the step to `complete` while the Done screen is still on show.
 */
export function usePlanFlow(upgrade: boolean, stage: PlanFlow["stage"]): void {
  const setFlow = useContext(PlanFlowContext);
  useLayoutEffect(() => {
    setFlow({ upgrade, stage });
    return () => setFlow(null);
  }, [setFlow, upgrade, stage]);
}
