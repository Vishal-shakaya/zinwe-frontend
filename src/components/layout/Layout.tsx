import { Suspense, useState, type ReactElement } from "react";
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
        {/* Lazy marketing pages (/plans) load under the nav, not instead of it. */}
        <Suspense
          fallback={
            <div className="dash-boot" role="status" aria-live="polite">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {heroCta ? <StickyCta target={heroCta} /> : null}
    </HeroCtaContext.Provider>
  );
}
