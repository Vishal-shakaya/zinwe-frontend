import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import { usePageMeta } from "../hooks/usePageMeta";

export default function NotFoundPage(): ReactElement {
  usePageMeta({
    title: "Page not found — Zinwe",
    description: "This page doesn't exist. Head back to the Zinwe home page or get in touch.",
    // The server answers every unknown address with the app (status 200): keep it out of search results.
    noindex: true,
  });

  return (
    <section className="page-hero page-hero--404 zin-host">
      <Smoke />
      <div className="wrap">
        <p className="eyebrow fade">Error 404</p>
        <StaggerTitle text="This page vanished in a puff of smoke." />
        <p className="lede fade" style={{ animationDelay: ".4s" }}>
          The link may be old, or the address mistyped. Everything else is where you left it.
        </p>
        <div className="page-hero__cta fade" style={{ animationDelay: ".55s" }}>
          <Link className="btn btn--primary btn--lg" to="/">
            Back to home <span className="arr">→</span>
          </Link>
          <Link className="btn btn--ghost btn--lg" to="/contact">
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
