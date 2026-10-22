import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";
import { openSupport } from "../features/support";
import { DashIcon } from "./DashIcon";

/** What the plan row offers: move up a plan, see the payment being checked, or just billing. */
export type PlanAction = "upgrade" | "checking" | "billing";

interface AccountMenuProps {
  initials: string;
  name: string;
  company: string;
  planName: string;
  planAction: PlanAction;
  onUpgrade: () => void;
  onFeedback: () => void;
  onLogout: () => void;
  leaving: boolean;
}

const ITEM = '[role="menuitem"]';

/**
 * The account row at the bottom of the sidebar. Tapping it opens a menu above it: the plan
 * (+ Upgrade), Profile, then help (How to use, Support, Policies, Give feedback), then Site
 * (the public website) and Log out. Arrow keys move through the items; Escape, an outside click or picking
 * an item closes it.
 */
export function AccountMenu({
  initials,
  name,
  company,
  planName,
  planAction,
  onUpgrade,
  onFeedback,
  onLogout,
  leaving,
}: AccountMenuProps): ReactElement {
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>(ITEM)?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close this menu only, not the phone's slide-in panel around it.
        e.stopImmediatePropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(wrap.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") setOpen(false);
  };

  const close = () => setOpen(false);

  return (
    <div className={cx("acct", open && "is-open")} ref={wrap}>
      {open ? (
        <div className="acct__menu" role="menu" id={menuId} aria-label="Account" onKeyDown={onMenuKey}>
          <div className="acct__plan">
            <small>Your plan</small>
            <b>{planName}</b>
          </div>
          {planAction === "upgrade" ? (
            <button
              type="button"
              role="menuitem"
              className="acct__item acct__item--primary"
              onClick={() => {
                close();
                onUpgrade();
              }}
            >
              <DashIcon name="arrow" />
              <span>Upgrade plan</span>
            </button>
          ) : (
            <Link role="menuitem" className="acct__item" to="/app/settings/billing" onClick={close}>
              <DashIcon name={planAction === "checking" ? "clock" : "card"} />
              <span>{planAction === "checking" ? "Payment being checked" : "Billing"}</span>
            </Link>
          )}
          <hr className="acct__rule" />
          {/* Company info, Billing and Password as tabs (URLs stay /app/settings/* for emails). */}
          <Link role="menuitem" className="acct__item" to="/app/settings" onClick={close}>
            <DashIcon name="user" />
            <span>Profile</span>
          </Link>
          <hr className="acct__rule" />
          <Link role="menuitem" className="acct__item" to="/app/help" onClick={close}>
            <DashIcon name="book" />
            <span>How to use</span>
          </Link>
          <Link role="menuitem" className="acct__item" to="/app/whats-new" onClick={close}>
            <DashIcon name="bell" />
            <span>What's new</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="acct__item"
            onClick={() => {
              close();
              openSupport();
            }}
          >
            <DashIcon name="help" />
            <span>Support</span>
          </button>
          <Link role="menuitem" className="acct__item" to="/app/policies" onClick={close}>
            <DashIcon name="shield" />
            <span>Policies</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="acct__item"
            onClick={() => {
              close();
              onFeedback();
            }}
          >
            <DashIcon name="chat" />
            <span>Give feedback</span>
          </button>
          <hr className="acct__rule" />
          <Link role="menuitem" className="acct__item" to="/" onClick={close}>
            <DashIcon name="home" />
            <span>Site</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="acct__item"
            onClick={() => {
              close();
              onLogout();
            }}
            disabled={leaving}
          >
            <DashIcon name="logout" />
            <span>{leaving ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      ) : null}

      <div className="dash__me">
        <button
          ref={button}
          type="button"
          className="acct__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="dash__avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="dash__who">
            <b>{name}</b>
            <small>{company}</small>
          </span>
          <DashIcon name="chevron" />
        </button>
      </div>
    </div>
  );
}
