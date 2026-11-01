import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  BLOCK_LIST_MAX_PAGE,
  errorMessage,
  getBlockLists,
  getBlockListSites,
  isAbortError,
  type BlockList,
  type BlockListSite,
  type WebCategory,
} from "../../lib/api";
import { ErrorBlock, Sk } from "../ui/States";
import { useResource } from "../useResource";
import { DEFAULT_LISTS, type RulesDraft, type WebChoice } from "./model";
import { Card, OptCard, Toggle } from "./parts";
import { normSite, siteError } from "./sites";

const PAGE_SIZE = 60;
const CHIPS_SHOWN = 30;

const WEB_MODES: ReadonlyArray<[WebChoice, string, string]> = [
  ["off", "Off", "Nothing about websites is recorded."],
  ["watch", "Watch only", "See which sites are used. Nothing is blocked."],
  ["block", "Block & watch", "Block your lists below, record the rest."],
];

/** The name to show for a site id, and which lists it is on, for every site this page has seen. */
type SiteInfo = Record<string, { name: string; lists: readonly WebCategory[] }>;

/** Thousands with commas, the way Indian offices read a count of a few thousand. */
function count(n: number): string {
  return n.toLocaleString("en-IN");
}

/** The ticks and search of one opened list. It fetches pages from the server, so a list of thousands stays light. */
function ListSites({
  list,
  allow,
  onFlip,
  onSites,
  onMany,
}: {
  list: BlockList;
  allow: ReadonlySet<string>;
  onFlip: (site: BlockListSite) => void;
  onSites: (sites: readonly BlockListSite[]) => void;
  /** Tick or untick every site of this list. */
  onMany: (sites: readonly BlockListSite[], tick: boolean) => void;
}): ReactElement {
  const [q, setQ] = useState("");
  const [sites, setSites] = useState<BlockListSite[]>([]);
  const [found, setFound] = useState(list.count);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [all, setAll] = useState<"" | "tick" | "untick">("");
  const seen = useRef(onSites);
  useEffect(() => {
    seen.current = onSites;
  }, [onSites]);

  // A short wait while typing, so each letter isn't a request.
  useEffect(() => {
    const ctl = new AbortController();
    const t = window.setTimeout(
      () => {
        setBusy(true);
        setErr("");
        getBlockListSites(list.key, { q: q.trim(), page, pageSize: PAGE_SIZE }, ctl.signal)
          .then((res) => {
            seen.current(res.sites);
            setSites((cur) => (page === 1 ? res.sites : [...cur, ...res.sites]));
            setFound(res.count);
            setHasMore(res.has_more);
            setBusy(false);
          })
          .catch((e: unknown) => {
            if (isAbortError(e)) return;
            setErr(errorMessage(e));
            setBusy(false);
          });
      },
      page === 1 && q ? 250 : 0,
    );
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [list.key, q, page]);

  const everySite = (tick: boolean) => {
    setAll(tick ? "tick" : "untick");
    setErr("");
    getBlockListSites(list.key, { pageSize: BLOCK_LIST_MAX_PAGE })
      .then((res) => onMany(res.sites, tick))
      .catch((e: unknown) => setErr(errorMessage(e)))
      .finally(() => setAll(""));
  };

  return (
    <div className="rl-kb">
      <div className="rl-kb-top">
        <input
          id={`search-${list.key}`}
          type="search"
          className="rl-inp"
          aria-label={`Search ${list.label}`}
          placeholder="Search this list"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <span style={{ display: "flex", gap: 14 }}>
          <button type="button" className="rl-link" disabled={all !== ""} onClick={() => everySite(true)}>
            {all === "tick" ? "Ticking…" : "Tick all"}
          </button>
          <button type="button" className="rl-link" disabled={all !== ""} onClick={() => everySite(false)}>
            {all === "untick" ? "Unticking…" : "Untick all"}
          </button>
        </span>
      </div>
      {list.masked ? <span className="rl-k">Names are partly hidden on this list. The full name is applied on every PC.</span> : null}
      <div className="rl-sites" role="group" aria-label={`Sites in ${list.label}`}>
        {sites.map((site) => {
          const ticked = !allow.has(site.id);
          return (
            <button key={site.id} type="button" role="checkbox" aria-checked={ticked} className={`rl-site ${ticked ? "on" : "off"}`} onClick={() => onFlip(site)}>
              <span className="rl-box" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4 10-10" />
                </svg>
              </span>
              <span className="rl-mono rl-site-n">{site.name}</span>
            </button>
          );
        })}
      </div>
      {busy && !sites.length ? (
        <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="z-sr">Loading sites…</span>
          <Sk w="60%" />
          <Sk w="40%" />
        </div>
      ) : null}
      {err ? (
        <span role="alert" className="rl-err">
          {err}
        </span>
      ) : null}
      {!busy && !err && !sites.length ? <span className="rl-k">No site in this list matches. Add it under Your own sites.</span> : null}
      {sites.length ? (
        <div className="rl-kb-top">
          <span className="rl-k" aria-live="polite">
            Showing {count(sites.length)} of {count(found)}
          </span>
          {hasMore ? (
            <button type="button" className="z-btn sm" disabled={busy} onClick={() => setPage(page + 1)}>
              {busy ? "Loading…" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Rules › Websites (board rules-web): how sites are treated; the six lists, each with its true size, opened in place
 * to search and tick; the owner's own sites (also in Watch only, so a list can be ready before blocking starts); and
 * the sites they unticked, which they can block again. Names on a hidden list only ever arrive masked (the server
 * masks them), so this page never holds a full name. What's picked is the page's draft, saved with the rest.
 */
export function WebsitesTab({
  d,
  initialSites,
  set,
}: {
  d: RulesDraft;
  /** The allow list as saved (policy.web.allow_sites): names for the ids. */
  initialSites: readonly BlockListSite[];
  set: (patch: Partial<RulesDraft>) => void;
}): ReactElement {
  const loadLists = useCallback((signal: AbortSignal) => getBlockLists(signal), []);
  const lists = useResource(loadLists);
  const [open, setOpen] = useState<WebCategory | null>(null);
  const [info, setInfo] = useState<SiteInfo>(() => Object.fromEntries(initialSites.map((s) => [s.id, s])));
  const [newSite, setNewSite] = useState("");
  const [newSiteErr, setNewSiteErr] = useState("");
  const [showAllAllowed, setShowAllAllowed] = useState(false);

  const allow = useMemo(() => new Set(d.allow), [d.allow]);
  const remember = useCallback((sites: readonly BlockListSite[]) => {
    setInfo((cur) => {
      const missing = sites.filter((s) => !cur[s.id]);
      return missing.length ? { ...cur, ...Object.fromEntries(missing.map((s) => [s.id, s])) } : cur;
    });
  }, []);

  const flip = (site: BlockListSite) => {
    remember([site]);
    set({ allow: allow.has(site.id) ? d.allow.filter((x) => x !== site.id) : [...d.allow, site.id] });
  };
  const many = (sites: readonly BlockListSite[], tick: boolean) => {
    remember(sites);
    const ids = new Set(sites.map((s) => s.id));
    set({ allow: tick ? d.allow.filter((x) => !ids.has(x)) : [...d.allow, ...sites.map((s) => s.id).filter((id) => !allow.has(id))] });
  };

  const choose = (web: WebChoice) => {
    // The first time blocking is chosen, the four protective lists come on: the owner sees them and can change them.
    set(web === "block" && d.cats.length === 0 ? { web, cats: [...DEFAULT_LISTS] } : { web });
  };

  const addSite = () => {
    const v = normSite(newSite);
    let err = siteError(v, "Type a site name, like example.com.");
    if (!err && d.sites.includes(v)) err = `${v} is already in your list.`;
    if (err) return setNewSiteErr(err);
    setNewSite("");
    setNewSiteErr("");
    set({ sites: [...d.sites, v], allow: d.allow.filter((x) => x !== v) });
  };

  const allowedIn = (key: WebCategory) => d.allow.filter((id) => info[id]?.lists.includes(key)).length;
  const blockedOf = (l: BlockList) => l.count - allowedIn(l.key);
  const blockedTotal = (lists.data?.lists ?? []).filter((l) => d.cats.includes(l.key)).reduce((n, l) => n + blockedOf(l), 0) + d.sites.length;
  const allowedShown = showAllAllowed ? d.allow : d.allow.slice(0, CHIPS_SHOWN);

  return (
    <>
      <Card title="How Zinwe treats websites" sub="Site names only, never full addresses, page contents or searches.">
        <div role="radiogroup" aria-label="Websites" className="rl-opts">
          {WEB_MODES.map(([k, label, desc]) => (
            <OptCard key={k} on={d.web === k} label={label} desc={desc} onPick={() => choose(k)} />
          ))}
        </div>
      </Card>

      {d.web === "off" ? (
        <div className="z-card rl-card rl-k">Websites are off, so nothing is recorded or blocked. Choose Watch only or Block &amp; watch to set your lists.</div>
      ) : (
        <>
          {d.web === "watch" ? (
            <div className="rl-banner">
              <span>Watch only is on, so nothing below is blocked yet. Your lists are saved and start working when you turn blocking on.</span>
              <button type="button" className="z-btn sm" onClick={() => choose("block")}>
                Turn on blocking
              </button>
            </div>
          ) : null}

          <Card
            title="Blocked site lists"
            sub="Turn a list on, then open it to see every site in it. Untick any site you want to allow."
            side={lists.data && d.web === "block" ? <span className="rl-pill accent">{count(blockedTotal)} sites blocked</span> : null}
          >
            {lists.error && !lists.data ? (
              <ErrorBlock title="We couldn't load the site lists" message={errorMessage(lists.error)} onRetry={lists.reload} />
            ) : !lists.data ? (
              <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="z-sr">Loading the site lists…</span>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Sk key={i} h={44} style={{ borderRadius: 10 }} />
                ))}
              </div>
            ) : (
              <div className="rl-kinds">
                {lists.data.lists.map((l) => {
                  const on = d.cats.includes(l.key);
                  const isOpen = open === l.key;
                  return (
                    <div key={l.key} className="rl-kind">
                      <div className="rl-kh">
                        <Toggle
                          on={on}
                          label={`Block ${l.label}`}
                          onChange={() => set({ cats: on ? d.cats.filter((x) => x !== l.key) : lists.data!.lists.map((x) => x.key).filter((k) => k === l.key || d.cats.includes(k)) })}
                        />
                        <span className="rl-kt">
                          <b>{l.label}</b>
                          <span className="rl-k">
                            {l.description} · {on ? `${count(blockedOf(l))} of ${count(l.count)} sites blocked` : `off, ${count(l.count)} sites in this list`}
                          </span>
                        </span>
                        <button type="button" className="z-btn sm" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "See"} ${l.label} sites`} onClick={() => setOpen(isOpen ? null : l.key)}>
                          {isOpen ? "Hide sites" : `See ${count(l.count)} sites`}
                          <svg className={isOpen ? "rl-chev up" : "rl-chev"} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 9l7 7 7-7" />
                          </svg>
                        </button>
                      </div>
                      {isOpen ? <ListSites list={l} allow={allow} onFlip={flip} onSites={remember} onMany={many} /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Your own sites" sub="Add any site. It's blocked on every PC, on top of the lists above.">
            <div className="rl-addr">
              <input
                id="addSite"
                className="rl-inp rl-mono"
                aria-label="Site to block"
                placeholder="example.com"
                value={newSite}
                aria-invalid={Boolean(newSiteErr)}
                aria-describedby="addSite-err"
                onChange={(e) => {
                  setNewSite(e.target.value);
                  setNewSiteErr("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSite();
                  }
                }}
              />
              <button type="button" className="z-btn" onClick={addSite}>
                Block site
              </button>
            </div>
            {newSiteErr ? (
              <span id="addSite-err" role="alert" className="rl-err">
                {newSiteErr}
              </span>
            ) : null}
            {d.sites.length ? (
              <div className="rl-chips">
                {d.sites.map((name) => (
                  <span key={name} className="rl-site-chip rl-mono">
                    {name}
                    <button type="button" aria-label={`Unblock ${name}`} onClick={() => set({ sites: d.sites.filter((x) => x !== name) })}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          {d.allow.length ? (
            <Card title="Allowed by you" sub="You unticked these. They open on every PC even though they're on a list.">
              <div className="rl-chips">
                {allowedShown.map((id) => {
                  const name = info[id]?.name ?? id;
                  return (
                    <span key={id} className="rl-site-chip rl-mono">
                      {name}
                      <button type="button" aria-label={`Block ${name} again`} onClick={() => set({ allow: d.allow.filter((x) => x !== id) })}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              {d.allow.length > CHIPS_SHOWN ? (
                <button type="button" className="rl-link" style={{ alignSelf: "flex-start" }} onClick={() => setShowAllAllowed(!showAllAllowed)}>
                  {showAllAllowed ? "Show fewer" : `Show all ${count(d.allow.length)}`}
                </button>
              ) : null}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
