import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { COOKIE_SETTINGS_EVENT, readCookieChoice, saveCookieChoice } from "../../lib/cookieConsent";
import "./legal.css";

/**
 * Cookie bottom sheet, on every page (website, sign-up, dashboard) until the
 * visitor chooses. Essential cookies are always on; analytics only with
 * consent. "Cookie settings" in the footer reopens it.
 */
export function CookieConsent(): ReactElement | null {
  const [open, setOpen] = useState(() => readCookieChoice() === null);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(() => readCookieChoice()?.analytics ?? false);

  useEffect(() => {
    const reopen = () => {
      setAnalytics(readCookieChoice()?.analytics ?? false);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (allowAnalytics: boolean) => {
    saveCookieChoice(allowAnalytics);
    setOpen(false);
    setDetails(false);
  };

  return (
    <section className="cookie-sheet" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
      <div className="cookie-sheet__inner">
        <div className="cookie-sheet__text">
          <h2 id="cookie-title">Cookies on Zinwe</h2>
          <p>
            We use essential cookies to keep you signed in and the site secure. With your OK, we also use analytics
            cookies to see which pages help — never for ads or cross-site tracking.{" "}
            <Link to="/legal/cookies">Cookie Policy</Link>
          </p>
          {details ? (
            <div className="cookie-sheet__prefs">
              <label className="cookie-pref">
                <input type="checkbox" checked disabled />
                <span>
                  <b>Essential</b>
                  <small>Sign-in, security and load balancing. Always on.</small>
                </span>
              </label>
              <label className="cookie-pref">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
                <span>
                  <b>Analytics</b>
                  <small>Anonymous page statistics so we can improve the site.</small>
                </span>
              </label>
            </div>
          ) : null}
        </div>
        <div className="cookie-sheet__actions">
          {details ? (
            <button type="button" className="btn btn--primary" onClick={() => choose(analytics)}>
              Save choices
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--primary" onClick={() => choose(true)}>
                Accept all
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => choose(false)}>
                Essential only
              </button>
              <button type="button" className="cookie-sheet__more" onClick={() => setDetails(true)}>
                Manage
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default CookieConsent;
