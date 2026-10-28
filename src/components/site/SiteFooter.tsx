import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { FOOTER_ABOUT, FOOTER_COLUMNS, FOOTER_LEGAL, type FooterLink } from "../../content/site/shell";
import { openCookieSettings } from "../../lib/cookieConsent";
import { Brand } from "../ui/Brand";

const YEAR = new Date().getFullYear();

function FootLink({ link, className }: { link: FooterLink; className?: string }): ReactElement {
  return link.to ? (
    <Link className={className} to={link.to}>
      {link.label}
    </Link>
  ) : (
    <a className={className} href={link.href}>
      {link.label}
    </a>
  );
}

/**
 * Website footer v3 (board SiteFooter): about + Start free, four link columns, the brand line in the owner's
 * wording ("Zinwe — IT Is OK | Security, simplified.", 29 Oct 2026) and the legal row. "Cookie settings" stays
 * in the legal row: the Cookie Policy promises it on every page.
 */
export function SiteFooter(): ReactElement {
  return (
    <footer className="zs-foot">
      <div className="zs-foot__in">
        <div className="zs-foot__top">
          <div className="zs-foot__about">
            <Brand ariaLabel="Zinwe home" tone="light" height={30} />
            <p>{FOOTER_ABOUT}</p>
            <Link className="zs-foot__cta" to="/signup?plan=free">
              Start free, up to 3 PCs
            </Link>
          </div>
          <div className="zs-foot__cols">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.label} className="zs-foot__col">
                <p className="zs-foot__label">{col.label}</p>
                {col.links.map((l) => (
                  <FootLink key={l.label} link={l} />
                ))}
                {col.note ? <span>{col.note}</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="zs-foot__line">
          <p className="zs-foot__tag">
            <span>Zinwe</span>
            <span className="sep" aria-hidden="true">
              —
            </span>
            <span className="ok">IT Is OK</span>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <span>Security, simplified.</span>
          </p>
          <Link className="zs-foot__start" to="/signup?plan=free">
            Start free →
          </Link>
        </div>
        <div className="zs-foot__legal">
          <span>© {YEAR} SKYTECHNO · zinwe.io</span>
          <span className="zs-foot__legal-links">
            {FOOTER_LEGAL.map((l) => (
              <FootLink key={l.label} link={l} />
            ))}
            <button type="button" onClick={openCookieSettings}>
              Cookie settings
            </button>
          </span>
        </div>
      </div>
    </footer>
  );
}
