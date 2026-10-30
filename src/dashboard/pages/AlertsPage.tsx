import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  EVENTS_DEFAULT_LIMIT,
  EVENTS_MAX_LIMIT,
  errorMessage,
  getPolicy,
  listDevices,
  listEvents,
  type DeviceEvent,
} from "../../lib/api";
import { AlertRow } from "../alerts/AlertRow";
import { AskSheet, type AskTarget } from "../alerts/AskSheet";
import { isDone, kindOf, levelOf, makePersonFor, viewOf, type AlertView } from "../alerts/alertModel";
import { markMany, useAsks } from "../alerts/useAsks";
import { groupAlerts } from "../features/alertGroups";
import { useEntitlements } from "../features/entitlements";
import { alertsOnly } from "../features/events";
import { useEventCounts } from "../features/useEventCounts";
import { SAMPLES_ON } from "../fixtures";
import { KIND_LABEL, LEVEL_DEF, type AlertKind } from "../fixtures/majorAlerts";
import { PageHead } from "../shell/PageHead";
import { useShell } from "../shell/shellContext";
import { useNow } from "../time";
import { EmptyBlock, ErrorBlock, Sheet, SkRows } from "../ui/States";
import { TipBody } from "../ui/Tooltip";
import { useTip } from "../ui/useTip";
import { ZIcon } from "../ui/ZIcon";
import { useResource } from "../useResource";
import "../../styles/dash13/alerts.css";

type TabKey = "needs" | "worth" | "done";
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ["needs", "Needs you"],
  ["worth", "Worth a look"],
  ["done", "Done"],
];

function parseId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function tabOf(e: DeviceEvent): TabKey {
  if (isDone(e)) return "done";
  return levelOf(e) === "needs" ? "needs" : "worth";
}

/** Read #alert=<id> from the hash (other pages link to one alert). */
function hashAlert(hash: string): number | undefined {
  return parseId(new URLSearchParams(hash.replace(/^#/, "")).get("alert"));
}

export default function AlertsPage(): ReactElement {
  usePageMeta({ title: "Alerts — Zinwe", description: "Every alert on your PCs, in plain English. Act on them here." });

  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const deviceId = parseId(params.get("device"));
  const memberId = deviceId === undefined ? parseId(params.get("member")) : undefined;
  const scopeKey = `${deviceId ?? "-"}|${memberId ?? "-"}`;
  const now = useNow();
  const tip = useTip();
  const { members } = useShell();
  const { has } = useEntitlements();

  const loadDevices = useCallback((signal: AbortSignal) => listDevices(signal, { includeRemoved: true }), []);
  const devices = useResource(loadDevices);
  const loadPolicy = useCallback((signal: AbortSignal) => getPolicy(signal), []);
  const policy = useResource(loadPolicy);
  const asks = useAsks();
  const totals = useEventCounts();

  // Open alerts (Needs you, Worth a look) come filtered on the server: handled ones can't crowd them out (FIX-013).
  const loadOpen = useCallback(
    (signal: AbortSignal) =>
      listEvents({ device: deviceId, member: memberId, kind: "alert", handled: false, limit: EVENTS_MAX_LIMIT }, signal),
    [deviceId, memberId],
  );
  const openEvents = useResource(loadOpen, { pollMs: 60_000, resetKey: scopeKey });
  // Done: alerts marked as fine, newest first; "Show older" asks for more (the feed has no offset).
  const [limit, setLimit] = useState(EVENTS_DEFAULT_LIMIT);
  const loadDone = useCallback(
    (signal: AbortSignal) => listEvents({ device: deviceId, member: memberId, kind: "alert", handled: true, limit }, signal),
    [deviceId, memberId, limit],
  );
  const doneEvents = useResource(loadDone, { pollMs: 60_000, resetKey: scopeKey });

  // Marked as fine / reopened here: shows at once, before the next poll.
  const [changed, setChanged] = useState<Record<number, DeviceEvent>>({});
  const [userTab, setUserTab] = useState<TabKey | null>(null);
  const [type, setType] = useState<AlertKind | "all">("all");
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());
  const targetId = hashAlert(location.hash);
  const [openRow, setOpenRow] = useState<number | null>(() => targetId ?? null);
  const [flash, setFlash] = useState<number | null>(() => targetId ?? null);
  const [busy, setBusy] = useState<ReadonlySet<number>>(() => new Set());
  const [toast, setToast] = useState("");
  const [ask, setAsk] = useState<AskTarget | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kbd, setKbd] = useState(false);

  const personFor = useMemo(() => makePersonFor(members, devices.data), [members, devices.data]);

  const all = useMemo(() => {
    const byId = new Map<number, DeviceEvent>();
    for (const e of [...alertsOnly(openEvents.data), ...alertsOnly(doneEvents.data)]) byId.set(e.id, changed[e.id] ?? e);
    return [...byId.values()].sort((x, y) => Date.parse(y.occurred_at) - Date.parse(x.occurred_at));
  }, [openEvents.data, doneEvents.data, changed]);

  const base = useMemo(() => all.filter((e) => type === "all" || kindOf(e) === type), [all, type]);
  // #alert=<id>: open that alert's tab (until the owner picks another).
  const target = targetId !== undefined ? all.find((e) => e.id === targetId) : undefined;
  const tab: TabKey = userTab ?? (target ? tabOf(target) : "needs");

  const openFull = (openEvents.data?.length ?? 0) >= EVENTS_MAX_LIMIT;
  const doneFull = (doneEvents.data?.length ?? 0) >= limit;
  const count = (k: TabKey) => base.filter((e) => tabOf(e) === k).length;
  const more = (k: TabKey) => (k === "done" ? doneFull : openFull);

  const views: AlertView[] = useMemo(() => {
    const shown = base.filter((e) => tabOf(e) === tab);
    return groupAlerts(shown).map((g) =>
      viewOf(g, { now, personFor, devices: devices.data, policy: policy.data, asks: asks.data }),
    );
  }, [base, tab, now, personFor, devices.data, policy.data, asks.data]);

  const days = useMemo(() => {
    const out: Array<{ key: string; label: string; items: AlertView[] }> = [];
    for (const v of views) {
      const last = out[out.length - 1];
      if (last && last.key === v.dayKey) last.items.push(v);
      else out.push({ key: v.dayKey, label: v.dayLabel, items: [v] });
    }
    return out;
  }, [views]);

  const loading = openEvents.data === undefined || (tab === "done" && doneEvents.data === undefined);
  const loadError = openEvents.data === undefined ? openEvents.error : tab === "done" && doneEvents.data === undefined ? doneEvents.error : undefined;

  // Scroll the linked alert into view once it is on screen (once), then let the outline fade.
  const targetRow = targetId !== undefined ? views.find((v) => v.ids.includes(targetId))?.id : undefined;
  const scrolled = useRef(false);
  useEffect(() => {
    if (targetRow === undefined || scrolled.current) return;
    scrolled.current = true;
    document.getElementById(`al-row-${targetRow}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [targetRow]);
  const targetVisible = targetRow !== undefined;
  useEffect(() => {
    if (flash === null || !targetVisible) return;
    const id = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(id);
  }, [flash, targetVisible]);

  // Toasts clear themselves.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Keyboard modality: the tab focus ring shows only after a key was used.
  useEffect(() => {
    const on = (e: globalThis.KeyboardEvent) => {
      if (/^(Tab|Arrow|Home|End)/.test(e.key)) setKbd(true);
    };
    const off = () => setKbd(false);
    document.addEventListener("keydown", on, true);
    document.addEventListener("pointerdown", off, true);
    return () => {
      document.removeEventListener("keydown", on, true);
      document.removeEventListener("pointerdown", off, true);
    };
  }, []);

  const applyChanged = (list: DeviceEvent[]) => setChanged((c) => ({ ...c, ...Object.fromEntries(list.map((e) => [e.id, e])) }));

  const setRowsBusy = (ids: readonly number[], on: boolean) =>
    setBusy((b) => {
      const next = new Set(b);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  /** Mark rows as fine (or reopen): at once on screen, then on the server; put back if it fails. */
  const mark = async (rows: AlertView[], handled: boolean, doneText: string) => {
    const ids = rows.flatMap((r) => r.ids);
    const before = all.filter((e) => ids.includes(e.id));
    const at = new Date().toISOString();
    applyChanged(before.map((e) => ({ ...e, handled_at: handled ? (e.handled_at ?? at) : null })));
    setRowsBusy(ids, true);
    setSelected((s) => new Set([...s].filter((id) => !rows.some((r) => r.id === id))));
    try {
      applyChanged(await markMany(ids, handled));
      setToast(doneText);
      totals.reload();
    } catch (err) {
      applyChanged(before);
      setToast(`Couldn't save: ${errorMessage(err)}`);
    } finally {
      setRowsBusy(ids, false);
    }
  };

  const pickTab = (k: TabKey) => {
    setUserTab(k);
    setSelected(new Set());
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = Math.max(0, TABS.findIndex((t) => t[0] === tab));
    const j = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    const k = TABS[j][0];
    pickTab(k);
    window.setTimeout(() => document.getElementById(`al-tab-${k}`)?.focus(), 20);
  };

  // Person / PC filter: one select (people, then PCs incl. removed ones), kept in the URL.
  const who = deviceId !== undefined ? `d${deviceId}` : memberId !== undefined ? `m${memberId}` : "all";
  const setWho = (value: string) => {
    const next = new URLSearchParams(params);
    next.delete("device");
    next.delete("member");
    if (value.startsWith("d")) next.set("device", value.slice(1));
    else if (value.startsWith("m")) next.set("member", value.slice(1));
    setParams(next, { replace: true });
    setLimit(EVENTS_DEFAULT_LIMIT);
    setSelected(new Set());
  };
  const people = (members ?? []).filter((m) => m.is_active);
  const pcs = devices.data ?? [];
  const nFilters = (who !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0);
  const clearFilters = () => {
    setWho("all");
    setType("all");
  };

  const sel = views.filter((v) => !v.done && selected.has(v.id));
  const canSelect = tab !== "done" && views.length > 0;
  const allSelected = views.length > 0 && sel.length === views.length;
  const shownCount = views.length;
  const markSelected = () => {
    if (!sel.length) return;
    void mark(sel, true, `${sel.length} ${sel.length === 1 ? "alert" : "alerts"} marked as fine. They are in Done.`);
  };

  const whoSelect = (id: string) => (
    <select id={id} className="zn-sel" value={who} onChange={(e) => setWho(e.target.value)}>
      <option value="all">Everyone</option>
      {people.length ? (
        <optgroup label="People">
          {people.map((m) => (
            <option key={m.id} value={`m${m.id}`}>
              {m.name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {pcs.length ? (
        <optgroup label="PCs">
          {pcs.map((d) => (
            <option key={d.id} value={`d${d.id}`}>
              {d.hostname}
              {d.is_revoked ? " (removed)" : ""}
            </option>
          ))}
        </optgroup>
      ) : null}
      {deviceId !== undefined && !pcs.some((d) => d.id === deviceId) ? <option value={`d${deviceId}`}>This PC</option> : null}
    </select>
  );
  const typeSelect = (id: string) => (
    <select id={id} className="zn-sel" value={type} onChange={(e) => setType(e.target.value as AlertKind | "all")}>
      {KIND_LABEL.map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );

  const emptyTitle = tab === "done" ? "Nothing done yet" : "All caught up";
  const emptyBody =
    tab === "done"
      ? "Alerts you mark as fine, and ones Zinwe handled on its own, stay here for your plan’s history."
      : "New alerts appear here within a minute of happening.";

  return (
    <div className={`zp-alerts${kbd ? " zn-kbd" : ""}`}>
      <PageHead
        title="Alerts"
        lede="Everything that happened on your PCs, in plain English. This is where you act on alerts. Repeats are grouped; Zinwe's own updates are hidden."
        actions={
          <Link className="z-btn sm" to="/app/rules#limits">
            Change limits
          </Link>
        }
      />

      <div className="zn-tabrow">
        <div role="tablist" aria-label="Alert level" className="zn-tabs">
          {TABS.map(([k, label]) => {
            const n = count(k);
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                id={`al-tab-${k}`}
                tabIndex={on ? 0 : -1}
                className={`zn-tab-btn${on ? " on" : ""}`}
                aria-selected={on}
                onClick={() => pickTab(k)}
                onKeyDown={onTabKey}
                {...tip.anchor(`tab-${k}`, <TipBody text={<><b>{label}</b> — {LEVEL_DEF[k]}</>} />)}
              >
                {label}{" "}
                <span className={`zn-count z-num${k === "needs" && n ? " red" : on ? " ink" : ""}`}>
                  {openEvents.data === undefined ? "–" : `${n.toLocaleString()}${more(k) && n ? "+" : ""}`}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className="z-btn sm zn-phone-only zn-al-filterbtn" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}>
          <ZIcon d="M4 6h16M7 12h10M10 18h4" size={15} stroke={2} />
          {nFilters ? `Filters · ${nFilters}` : "Filters"}
        </button>
        <div className="zn-desk-only zn-al-filters">
          <label className="z-sr" htmlFor="f-person">
            Person or PC
          </label>
          {whoSelect("f-person")}
          <label className="z-sr" htmlFor="f-type">
            Type
          </label>
          {typeSelect("f-type")}
        </div>
      </div>

      {toast ? (
        <div role="status" className="zn-al-toast">
          {toast}
        </div>
      ) : null}

      <section className="z-card zn-al-card" aria-label={TABS.find((t) => t[0] === tab)?.[1]} data-tip-bound="list">
        {canSelect && !loading ? (
          <div className="zn-al-selbar">
            <label>
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(views.map((v) => v.id)))} />
              {sel.length ? `${sel.length} selected` : `Select all ${shownCount}`}
            </label>
            <div className="zn-desk-only" style={{ display: "flex", gap: 8 }}>
              <button type="button" className="z-btn sm" disabled={sel.length === 0} onClick={markSelected}>
                Mark as fine
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          loadError ? (
            <ErrorBlock
              title="We couldn't load your alerts"
              message={errorMessage(loadError)}
              onRetry={() => {
                openEvents.reload();
                doneEvents.reload();
              }}
            />
          ) : (
            <SkRows label="Loading alerts…" rows={5} />
          )
        ) : views.length === 0 ? (
          <div className="zn-al-empty">
            {nFilters && all.length ? (
              <EmptyBlock icon="filter" title="Nothing matches these filters" action={<button type="button" className="z-btn sm" onClick={clearFilters}>Clear filters</button>}>
                {emptyBody}
              </EmptyBlock>
            ) : (
              <>
                <b style={{ fontSize: 16 }}>{emptyTitle}</b>
                <span style={{ color: "#6B6B6B" }}>{emptyBody}</span>
              </>
            )}
          </div>
        ) : (
          days.map((day) => (
            <div key={day.key}>
              <div className="z-lbl" style={{ padding: "12px 16px 6px" }}>
                {day.label}
              </div>
              {day.items.map((a) => (
                <AlertRow
                  key={a.id}
                  a={a}
                  open={openRow !== null && a.ids.includes(openRow)}
                  flash={flash !== null && a.ids.includes(flash)}
                  selected={selected.has(a.id)}
                  busy={a.ids.some((id) => busy.has(id))}
                  canAsk={has("team_chat")}
                  tip={tip}
                  onToggleOpen={() => setOpenRow(openRow !== null && a.ids.includes(openRow) ? null : a.id)}
                  onToggleSelect={() =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (next.has(a.id)) next.delete(a.id);
                      else next.add(a.id);
                      return next;
                    })
                  }
                  onAsk={() => {
                    if (!a.person) return;
                    tip.hide();
                    setToast("");
                    setAsk({
                      ids: a.ids,
                      memberId: a.person.id,
                      first: a.first,
                      title: a.title,
                      severity: a.level === "needs" ? "critical" : a.level === "worth" ? "warning" : "info",
                      draft: a.draft,
                    });
                  }}
                  onFine={() => void mark([a], true, `“${a.title}” marked as fine. It is in Done.`)}
                  onReopen={() => void mark([a], false, `“${a.title}” is open again.`)}
                  onDevicesChanged={devices.reload}
                  onChanged={(next) => {
                    applyChanged([next]);
                    totals.reload();
                  }}
                />
              ))}
            </div>
          ))
        )}

        {!loading && tab === "done" && doneFull && limit < EVENTS_MAX_LIMIT ? (
          <div className="zn-al-foot">
            <button
              type="button"
              className="z-btn sm"
              disabled={doneEvents.pending}
              onClick={() => setLimit((l) => Math.min(l + EVENTS_DEFAULT_LIMIT, EVENTS_MAX_LIMIT))}
            >
              {doneEvents.pending ? "Loading…" : "Show older alerts"}
            </button>
          </div>
        ) : !loading && tab !== "done" && openFull ? (
          <p className="zn-al-foot zn-al-note">Showing the latest {EVENTS_MAX_LIMIT} alerts not marked as fine yet.</p>
        ) : null}
        {!loading && totals.data && who === "all" ? (
          <p className="zn-al-foot zn-al-note z-num">
            {totals.data.alerts.toLocaleString()} {totals.data.alerts === 1 ? "alert" : "alerts"} in your plan’s history ·{" "}
            {totals.data.unhandled.toLocaleString()} not marked as fine yet
          </p>
        ) : null}

        {tab !== "done" && sel.length > 0 ? (
          <div className="zn-sticky">
            <button type="button" className="z-btn dark" onClick={markSelected}>
              Mark {sel.length} {sel.length === 1 ? "alert" : "alerts"} as fine
            </button>
          </div>
        ) : null}
      </section>

      {tip.node}

      <AskSheet
        target={ask}
        where="alert"
        onClose={() => setAsk(null)}
        onSent={(t) => {
          setAsk(null);
          setToast(`Sent to ${t.first}’s Zinwe app. The reply shows ${SAMPLES_ON ? "on this alert and " : ""}in Chat.`);
        }}
      />

      <Sheet open={filtersOpen} title="Filters" onClose={() => setFiltersOpen(false)} labelledBy="al-sheet-h">
        <label htmlFor="fs-person" style={{ fontSize: 13, fontWeight: 600 }}>
          Person or PC
        </label>
        {whoSelect("fs-person")}
        <label htmlFor="fs-type" style={{ fontSize: 13, fontWeight: 600 }}>
          Type
        </label>
        {typeSelect("fs-type")}
        <div className="zn-sheet-acts">
          <button type="button" className="z-btn sm" onClick={clearFilters}>
            Clear
          </button>
          <button type="button" className="z-btn sm dark" onClick={() => setFiltersOpen(false)}>
            Show {shownCount} {shownCount === 1 ? "alert" : "alerts"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
