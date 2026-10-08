import { useState, type ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { useScrollOnNavigate } from "../../hooks/useScrollOnNavigate";
import { Footer } from "./Footer";
import { HeroCtaContext } from "./heroCtaContext";
import { Nav } from "./Nav";
import { StickyCta } from "./StickyCta";

/** Page shell shared by every route: nav, <main>, footer, mobile sticky CTA. */
export function Layout(): ReactElement {
  const [heroCta, setHeroCta] = useState<HTMLElement | null>(null);
  useScrollOnNavigate();

  return (
    <HeroCtaContext.Provider value={setHeroCta}>
      <Nav />
      <main>
        <Outlet />
      </main>
      <Footer />
      {heroCta ? <StickyCta target={heroCta} /> : null}
    </HeroCtaContext.Provider>
  );
}
