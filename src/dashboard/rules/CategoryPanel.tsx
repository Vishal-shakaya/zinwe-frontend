import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { CATEGORY_LISTS } from "../fixtures/rules";
import type { WebCategory } from "../../lib/api";
import { normSite, siteError } from "./sites";

const PAGE_SIZE = 12;
const PILL: Record<string, { bg: string; fg: string; bd: string }> = {
  Blocked: { bg: "#141210", fg: "#fff", bd: "#141210" },
  Allowed: { bg: "#FFFFFF", fg: "#141210", bd: "#141210" },
  "Not blocked": { bg: "#F5F5F5", fg: "#404040", bd: "#D4D4D4" },
};

/**
 * "See the list" on a website kind (board DashRules category panel): a side panel with the kind's sites (sample,
 * fixtures/rules.ts), search, load more, and two shortcuts — block another site (Custom sites) or allow one
 * (Always allowed). Esc or Close shuts it; focus goes back to the button that opened it.
 */
export function CategoryPanel({
  cat,
  label,
  on,
  sites,
  allow,
  onBlock,
  onAllow,
  onClose,
}: {
  cat: WebCategory;
  label: string;
  /** This kind is switched on. */
  on: boolean;
  sites: readonly string[];
  allow: readonly string[];
  /** Add to Custom sites; returns the confirmation line. */
  onBlock: (site: string) => string;
  onAllow: (site: string) => string;
  onClose: () => void;
}): ReactElement {
  const info = CATEGORY_LISTS[cat];
  const [q, setQ] = useState("");
  const [pages, setPages] = useState(1);
  const [blockIn, setBlockIn] = useState("");
  const [allowIn, setAllowIn] = useState("");
  const [blockErr, setBlockErr] = useState("");
  const [allowErr, setAllowErr] = useState("");
  const [toast, setToast] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    document.getElementById("zn-cat-close")?.focus();
    return () => back?.focus?.();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const query = q.trim().toLowerCase();
  const loaded = info.sites.slice(0, pages * PAGE_SIZE);
  const shown = query ? loaded.filter((x) => x.includes(query)) : loaded;

  const block = () => {
    const v = normSite(blockIn);
    let err = siteError(v, "Type a site name, like example.com.");
    if (!err && sites.includes(v)) err = `${v} is already in your Custom sites.`;
    if (!err && !info.masked && info.sites.includes(v) && on) err = `${v} is already blocked in ${label}.`;
    if (err) return setBlockErr(err);
    setBlockIn("");
    setToast(onBlock(v));
  };
  const allowSite = () => {
    const v = normSite(allowIn);
    let err = siteError(v, "Type the site to allow, like example.com.");
    if (!err && allow.includes(v)) err = `${v} is already always allowed.`;
    if (err) return setAllowErr(err);
    setAllowIn("");
    setToast(onAllow(v));
  };
  const enter = (fn: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>("button, input, a[href]")).filter(
      (x) => !(x as HTMLButtonElement).disabled && x.tabIndex !== -1,
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 160 }}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close the list"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "rgba(20,18,16,.35)", border: 0, cursor: "default" }}
      />
      <div
        ref={box}
        id="zn-cat"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zn-cat-t"
        aria-describedby="zn-cat-d"
        onKeyDown={trap}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 460, maxWidth: "100%", background: "#fff", boxShadow: "-20px 0 44px -18px rgba(20,18,16,.35)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "18px 20px 14px", borderBottom: "1px solid #E5E5E5" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="zn-cat-t" style={{ margin: 0, fontSize: 19, letterSpacing: "-0.01em" }}>
              {label} · {info.count} sites
            </h2>
            <span id="zn-cat-d" className="rl-k">
              Updated daily from public blocklists
            </span>
          </div>
          <button type="button" id="zn-cat-close" className="z-btn sm" aria-label="Close" onClick={onClose} style={{ width: 36, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {!on ? (
            <p style={{ margin: 0, fontSize: 13, color: "#A84505", background: "#FDEBDC", borderRadius: 8, padding: "8px 10px" }}>
              This kind is off, so these sites are not blocked yet. Turn it on under Websites.
            </p>
          ) : null}
          {info.masked ? (
            <p style={{ margin: 0, fontSize: 13, color: "#404040", background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 10px" }}>
              Names are partly hidden. The full list is applied on every PC.
            </p>
          ) : null}
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor="zn-cat-q" style={{ fontSize: 13, fontWeight: 600 }}>
              Search this list
            </label>
            <input id="zn-cat-q" type="search" className="rl-inp rl-mono" placeholder="Search sites" value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid #E5E5E5", borderRadius: 12 }}>
            {shown.map((name, i) => {
              const status = allow.includes(name) ? "Allowed" : on ? "Blocked" : "Not blocked";
              const p = PILL[status];
              return (
                <li
                  key={name}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 12px", fontSize: 13.5, borderTop: i ? "1px solid #F5F5F5" : undefined }}
                >
                  <span className="rl-mono" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    {name}
                  </span>
                  <span
                    style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: p.bg, color: p.fg, border: `1px solid ${p.bd}` }}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
          {query && shown.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#404040" }}>No site in the list shown matches “{q}”. You can block it below.</p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span className="rl-k" aria-live="polite">
              {query
                ? `${shown.length}${shown.length === 1 ? " match" : " matches"} in the ${loaded.length} sites shown`
                : `Showing ${loaded.length} of ${info.count}`}
            </span>
            {!query && loaded.length < info.sites.length ? (
              <button type="button" className="z-btn sm" onClick={() => setPages(pages + 1)}>
                Load more
              </button>
            ) : null}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #E5E5E5", background: "#FAFAFA", padding: "14px 20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div role="status" aria-live="polite" className={toast ? "rl-toast on" : "rl-toast"}>
            {toast}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="zn-block-in" style={{ fontWeight: 600 }}>
              Block another site
            </label>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <input
                id="zn-block-in"
                className="rl-inp rl-mono"
                style={{ flex: "1 1 200px", minWidth: 0 }}
                placeholder="example.com"
                value={blockIn}
                aria-invalid={Boolean(blockErr)}
                aria-describedby="zn-block-err"
                onChange={(e) => {
                  setBlockIn(e.target.value);
                  setBlockErr("");
                }}
                onKeyDown={enter(block)}
              />
              <button type="button" className="z-btn sm" onClick={block}>
                Block site
              </button>
            </span>
            {blockErr ? (
              <span id="zn-block-err" role="alert" className="rl-err">
                {blockErr}
              </span>
            ) : null}
            <span className="rl-k">Added to your Custom sites.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="zn-allow-in" style={{ fontWeight: 600 }}>
              Something blocked by mistake? Allow a site
            </label>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <input
                id="zn-allow-in"
                className="rl-inp rl-mono"
                style={{ flex: "1 1 200px", minWidth: 0 }}
                placeholder="example.com"
                value={allowIn}
                aria-invalid={Boolean(allowErr)}
                aria-describedby="zn-allow-err"
                onChange={(e) => {
                  setAllowIn(e.target.value);
                  setAllowErr("");
                }}
                onKeyDown={enter(allowSite)}
              />
              <button type="button" className="z-btn sm" onClick={allowSite}>
                Allow site
              </button>
            </span>
            {allowErr ? (
              <span id="zn-allow-err" role="alert" className="rl-err">
                {allowErr}
              </span>
            ) : null}
            <span className="rl-k">Added to Always allowed. It opens on every PC, even if a list blocks it.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
