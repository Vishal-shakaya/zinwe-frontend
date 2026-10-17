import { AnnouncementBar } from "../../components/ui/AnnouncementBar";
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../../components/ui/Brand";
import { Icon } from "../../components/ui/Icon";
import { Smoke } from "../../components/ui/Smoke";
import { AUTH_POINTS } from "../../content/portal";
import "../../styles/dashboard.css";
import "../../styles/portal.css";

interface AuthShellProps {
  /** Below the card, e.g. "New to Zinwe? Create an account". */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Sign up / log in / reset layout: a brand panel with light Zin smoke on the
 * left (desktop only) and the form card on the right. One column on phones.
 */
export function AuthShell({ footer, children }: AuthShellProps): ReactElement {
  return (
    <div className="auth" data-clarity-mask="true">
      <aside className="auth__side zin-host" aria-hidden="true">
        <Smoke className="auth__smoke" />
        <div className="auth__side-inner">
          <Brand variant="static" height={32} />
          <div>
            <p className="auth__kicker">Zinwe for business owners</p>
            <h2 className="auth__headline">Know what's happening to your data. In plain English.</h2>
            <ul className="perks">
              {AUTH_POINTS.map((point) => (
                <li key={point.title}>
                  <span className="perks__mark">
                    <Icon name="check" />
                  </span>
                  <div>
                    <b>{point.title}</b>
                    <span>{point.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <small className="auth__small">For teams of 5–50 in India and the US.</small>
        </div>
      </aside>

      <div className="auth__main">
        <AnnouncementBar className="abar--flush" />
        <div className="auth__top">
          <span className="auth__mobile-brand">
            <Brand ariaLabel="Zinwe home" height={24} />
          </span>
          <Link className="dash-link auth__back" to="/">
            ← Back to site
          </Link>
        </div>
        <main className="auth__body">
          <div className="auth__card">{children}</div>
          {footer ? <p className="auth__alt">{footer}</p> : null}
        </main>
      </div>
    </div>
  );
}
