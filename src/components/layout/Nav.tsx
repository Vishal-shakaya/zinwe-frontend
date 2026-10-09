import { useEffect, useState, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { cx } from "../../lib/cx";
import { Brand } from "../ui/Brand";

export function Nav(): ReactElement {
  const { pathname } = useLocation();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);
  const current = (path: string) => (pathname === path ? "page" : undefined);

  return (
    <header className={cx("nav", scrolled && "is-scrolled")}>
      <div className="wrap nav__row">
        <Brand ariaLabel="Zinwe home" />
        <button
          className={cx("nav__burger", open && "is-open")}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <ul className={cx("nav__links", open && "is-open")}>
          <li className="nav__home">
            <Link to="/" aria-current={current("/")} onClick={close}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/#how" onClick={close}>
              How it works
            </Link>
          </li>
          <li>
            <Link to="/plans" aria-current={current("/plans")} onClick={close}>
              Plans
            </Link>
          </li>
          <li>
            <Link to="/contact" aria-current={current("/contact")} onClick={close}>
              Contact
            </Link>
          </li>
          <li>
            <Link to={token ? "/app" : "/login"} onClick={close}>
              {token ? "Dashboard" : "Log in"}
            </Link>
          </li>
          {token ? null : (
            <li className="nav__signup">
              <Link className="btn btn--ghost" to="/signup" onClick={close}>
                Sign up
              </Link>
            </li>
          )}
          <li>
            <Link className="btn btn--primary" to="/signup?plan=early-access" onClick={close}>
              Get 3 months free <span className="arr">→</span>
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
