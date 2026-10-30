import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ICONS } from "../components/site/icons";
import { PathIcon } from "../components/site/SiteIcon";
import { usePageMeta } from "../hooks/usePageMeta";

const POPULAR: ReadonlyArray<{ label: string; to: string; icon: string }> = [
  { label: "Log in to your dashboard", to: "/login", icon: ICONS.login },
  { label: "Plans and prices", to: "/plans", icon: ICONS.wallet },
  { label: "Download Zinwe for Windows", to: "/download", icon: ICONS.download },
  { label: "Chat, tasks and reports", to: "/product", icon: ICONS.chat },
  { label: "Guides and articles", to: "/blog", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" },
];

/** 404 (board SiteNotFound). The server sends 404.html with status 404 for unknown addresses; noindex is a second guard. */
export default function NotFoundPage(): ReactElement {
  usePageMeta({
    title: "Page not found | Zinwe",
    description: "This page doesn't exist. Head back to the Zinwe home page or get in touch.",
    noindex: true,
  });

  return (
    <section className="zs-wrap zs-404">
      <div className="zs-404__copy">
        <span className="zs-mono zs-404__code">ERROR 404</span>
        <h1 className="zs-h1">This page vanished in a puff of smoke.</h1>
        <p>The link may be old, or the address mistyped. Everything else is where you left it.</p>
        <div className="zs-404__acts">
          <Link className="zs-btn zs-btn--pri zs-btn--flat" to="/">
            Back to home
          </Link>
          <Link className="zs-btn" to="/contact?mode=message">
            Tell us what you were looking for
          </Link>
        </div>
      </div>
      <nav className="zs-404__go" aria-label="Popular pages">
        <b>People usually want</b>
        {POPULAR.map((l) => (
          <Link key={l.to} className="zs-404__link" to={l.to}>
            <span className="zs-404__icon" aria-hidden="true">
              <PathIcon d={l.icon} size={17} />
            </span>
            <span className="zs-404__label">{l.label}</span>
            <span className="arr" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
