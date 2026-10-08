import { createContext, useContext } from "react";

/**
 * Lets the home hero hand its CTA row to the Layout, which shows the mobile
 * sticky CTA (only while that element exists, i.e. on the home page).
 */
export const HeroCtaContext = createContext<(el: HTMLElement | null) => void>(() => {});

export function useHeroCtaRef(): (el: HTMLElement | null) => void {
  return useContext(HeroCtaContext);
}
