import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { openCookieSettings } from "../../lib/cookieConsent";
import { COMPANY_EMAIL } from "../../content/company";
import { BRAND_LINE } from "../../content/seo";
import { Brand } from "../ui/Brand";
import { SocialLinks } from "../ui/SocialLinks";

const YEAR = new Date().getFullYear();

export function Footer(): ReactElement {
  return (
    <footer className="footer">
      <div className="wrap footer__row">
        <div>
          <Brand ariaLabel="Zinwe home" height={26} />
          <p className="footer__meta">
            <b className="footer__line">{BRAND_LINE} Security, simplified.</b>
            <br />
            Data protection for small businesses in India and the US.
            <br />
            SKYTECHNO · New Delhi, India
            <br />
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </p>
          <SocialLinks className="footer__social" />
        </div>
        <ul className="footer__links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/plans">Plans</Link>
          </li>
          <li>
            <Link to="/download">Download</Link>
          </li>
          <li>
            <Link to="/early-access">Book a setup call</Link>
          </li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
        <p className="footer__meta">
          © <span data-year="">{YEAR}</span> SKYTECHNO. zinwe.io
        </p>
      </div>
      <div className="wrap footer__legal">
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/privacy">Privacy</Link>
        <Link to="/legal/refund">Refunds</Link>
        <Link to="/legal/cookies">Cookies</Link>
        <Link to="/legal/acceptable-use">Acceptable use</Link>
        <Link to="/legal/disclaimer">Disclaimer</Link>
        <button type="button" onClick={openCookieSettings}>
          Cookie settings
        </button>
      </div>
    </footer>
  );
}
