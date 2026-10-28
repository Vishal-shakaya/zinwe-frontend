import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { NAV_LINKS, WHATS_NEW_BAR } from "../../content/site/shell";
import { Brand } from "../ui/Brand";

/** The active header item for a path (the prototype's `active` prop). */
function activeKey(pathname: string): string {
  if (pathname === "/product") return "product";
  if (pathname === "/plans") return "plans";
  if (pathname === "/download") return "download";
  if (pathname === "/contact") return "contact";
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return "blog";
  return "none";
}

/**
 * Website header v3 (board SiteNav): white bar, warm hairline, the five links and Log in / Start free
 * (signed in: Dashboard). The dark "what's new" strip above it is off until 1.3 ships (WHATS_NEW_BAR.on).
 * Under 860 px the links fold into a menu button that opens a full-width list; Escape or a link closes it.
 */
export function SiteNav(): ReactElement {
  const { pathname } = useLocation();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const active = activeKey(pathname);

  // A new page closes the menu.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (headRef.current && !headRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const links = (className: string) =>
    NAV_LINKS.map((l) => (
      <Link key={l.key} className={className} to={l.to} aria-current={l.key === active ? "page" : undefined}>
        {l.label}
      </Link>
    ));

  return (
    <div className="zs-head" ref={headRef}>
      {WHATS_NEW_BAR.on ? (
        <div className="zs-bar">
          <div className="zs-bar__in">
            <span className="zs-bar__new">New</span>
            <span>{WHATS_NEW_BAR.text}</span>
            <Link className="zs-bar__more" to={WHATS_NEW_BAR.to}>
              {WHATS_NEW_BAR.link}
            </Link>
          </div>
        </div>
      ) : null}
      <header className="zs-header">
        <div className="zs-header__row">
          <Brand ariaLabel="Zinwe home" height={30} />
          <nav className="zs-nav" aria-label="Main">
            {links("zs-nav__link")}
          </nav>
          <div className="zs-header__end">
            {token ? (
              <Link className="zs-hbtn zs-hbtn--pri" to="/app">
                Dashboard
              </Link>
            ) : (
              <>
                <Link className="zs-hbtn zs-hbtn--ghost zs-hbtn--login" to="/login">
                  Log in
                </Link>
                <Link className="zs-hbtn zs-hbtn--pri" to="/signup?plan=free">
                  Start free
                </Link>
              </>
            )}
            <button
              ref={menuRef}
              type="button"
              className="zs-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="zs-drop"
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
              </svg>
            </button>
          </div>
        </div>
        {open ? (
          <nav id="zs-drop" className="zs-drop" aria-label="Main">
            {links("zs-drop__link")}
            {token ? null : (
              <Link className="zs-hbtn zs-hbtn--ghost" to="/login">
                Log in
              </Link>
            )}
          </nav>
        ) : null}
      </header>
    </div>
  );
}
