import { Suspense, useState, type ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { useScrollOnNavigate } from "../../hooks/useScrollOnNavigate";
import { SiteFooter } from "../site/SiteFooter";
import { SiteNav } from "../site/SiteNav";
import { AnnouncementBar } from "../ui/AnnouncementBar";
import { HeroCtaContext } from "./heroCtaContext";
import { StickyCta } from "./StickyCta";
import "../../styles/site-v3.css";
import "../../styles/site-phone.css";

/**
 * Page shell shared by every marketing route (website v3, 29 Oct 2026): the admin's announcement bar, the v3 header,
 * <main>, the v3 footer, and the mobile sticky CTA for pages that register a hero CTA. The `.zs` root carries the v3
 * tokens; the older marketing pages inherit the same palette through it.
 */
export function Layout(): ReactElement {
  const [heroCta, setHeroCta] = useState<HTMLElement | null>(null);
  useScrollOnNavigate();

  return (
    <HeroCtaContext.Provider value={setHeroCta}>
      <div className="zs">
        <AnnouncementBar />
        <SiteNav />
        <main>
          {/* Lazy marketing pages load under the header, not instead of it. */}
          <Suspense
            fallback={
              <div className="zs-wrap zs-boot" role="status" aria-live="polite">
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
        {heroCta ? <StickyCta target={heroCta} /> : null}
      </div>
    </HeroCtaContext.Provider>
  );
}
