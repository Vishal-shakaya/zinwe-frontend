import { useCallback, useEffect, useState, type KeyboardEvent, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, type Policy, type UsbMode } from "../../lib/api";
import { useEntitlements } from "../features/entitlements";
import { usePolicy } from "../features/usePolicy";
import { SAMPLES_ON } from "../fixtures";
import { getRulesExtras, saveRulesExtras } from "../fixtures/rules";
import { dMid } from "../reports/dates";
import { CategoryPanel } from "../rules/CategoryPanel";
import { normSite, siteError } from "../rules/sites";
import {
  CATEGORIES,
  changedKeys,
  draftFrom,
  extrasFrom,
  GB,
  isApiCategory,
  MB,
  policyPatch,
  REMOTE_SEED,
  agentName,
  toolId,
  type RulesDraft,
  type ToolMode,
  type WebChoice,
} from "../rules/model";
import { Def, OptCard, Section, SizeField, SwitchRow, Toggle } from "../rules/parts";
import { PlanNote } from "../rules/PlanNote";
import { useLeaveGuard } from "../rules/useLeaveGuard";
import { PageHead } from "../shell/PageHead";
import { ErrorBlock, Sheet, Sk } from "../ui/States";
import { useTip } from "../ui/useTip";
import { useResource } from "../useResource";
import "../../styles/dash13/rules.css";

const ALL_SECTIONS: ReadonlyArray<[string, string]> = [
  ["hours", "Work hours"],
  ["web", "Websites"],
  ["usb", "USB & files"],
  ["limits", "Limits"],
  ["remote", "Remote tools"],
  ["software", "Software"],
];
/**
 * Work hours (break / early End day OKs) and Software (new-software alerts) hold only settings the policy API doesn't
 * save yet (fixtures/rules.ts): production builds (SAMPLES_ON off) leave both sections out.
 */
const SECTIONS = SAMPLES_ON ? ALL_SECTIONS : ALL_SECTIONS.filter(([k]) => k !== "hours" && k !== "software");
const SECTION_ALIAS: Record<string, string> = { websites: "web", files: "usb", remotes: "remote", tools: "remote", apps: "remote", soft: "software", work: "hours" };
const ALL_MODES: ReadonlyArray<[ToolMode, string]> = [
  ["block", "Block"],
  ["watch", "Watch"],
  ["allow", "Allow"],
];
/** Allow (no alert) is sample-only: the policy API only knows blocked or not. */
const MODES = SAMPLES_ON ? ALL_MODES : ALL_MODES.filter(([k]) => k !== "allow");
const EXE_RE = /^[^\\/:*?"<>|\s][^\\/:*?"<>|]*\.exe$/i;

/** Page names for the leave guard ("2 changes to leave for Alerts"). */
const PAGE_NAMES: ReadonlyArray<[string, string]> = [
  ["/app/alerts", "Alerts"],
  ["/app/activity", "Activity"],
  ["/app/internet", "Internet usage"],
  ["/app/data", "Data safety"],
  ["/app/remote", "Apps & remote tools"],
  ["/app/team", "Team & PCs"],
  ["/app/chat", "Chat"],
  ["/app/tasks", "Tasks"],
  ["/app/reports", "Reports"],
  ["/app/settings", "Settings"],
  ["/app/help", "Help & support"],
];
function pageName(path: string): string | null {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "");
  if (p === "/app") return "Overview";
  return PAGE_NAMES.find(([k]) => p === k || p.startsWith(`${k}/`))?.[1] ?? null;
}

function clock(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function versionLine(p: Policy): string {
  const at = new Date(p.updated_at);
  const recent = Date.now() - at.getTime() < 90_000;
  const day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
  return `Version ${p.version} · ${recent ? "changed just now" : `changed ${dMid(day)}, ${clock(at)}`}`;
}

/**
 * Rules (board DashRules): every protection in one place — work hours, websites, USB & files, limits, remote tools
 * and software. Changes are drafted here and go out together with "Save and send to PCs" (PUT devices/policy/,
 * only the blocks that changed). Leaving with unsaved changes asks first (links, Back, reload).
 * Settings the policy API doesn't hold yet are sample (fixtures/rules.ts). /app/setup redirects here.
 * Links: /app/rules#limits (or #section=limits) opens and scrolls to that section.
 */
export default function RulesPage(): ReactElement {
  usePageMeta({ title: "Rules — Zinwe", description: "Every protection in one place." });
  const { policy, commit } = usePolicy();
  const loadExtras = useCallback((signal: AbortSignal) => getRulesExtras(signal), []);
  const extras = useResource(loadExtras);
  const { has } = useEntitlements();
  const tip = useTip();
  const { hash } = useLocation();

  const [saved, setSaved] = useState<RulesDraft | null>(null);
  const [d, setD] = useState<RulesDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [acc, setAcc] = useState<Record<string, boolean>>({ [SECTIONS[0][0]]: true });
  const [panel, setPanel] = useState<string | null>(null);
  const [newSite, setNewSite] = useState("");
  const [newSiteErr, setNewSiteErr] = useState("");
  const [toolName, setToolName] = useState("");
  const [toolExe, setToolExe] = useState("");
  const [toolErr, setToolErr] = useState({ name: "", exe: "" });
  const [advOpen, setAdvOpen] = useState(false);
  const [rToast, setRToast] = useState("");

  if (!saved && policy.data && extras.data) {
    const first = draftFrom(policy.data, extras.data);
    setSaved(first);
    setD(first);
  }

  useEffect(() => {
    if (!rToast) return;
    const id = window.setTimeout(() => setRToast(""), 6000);
    return () => window.clearTimeout(id);
  }, [rToast]);

  const changes = saved && d ? changedKeys(saved, d).length : 0;
  const changeWord = changes === 1 ? "change" : "changes";
  const guard = useLeaveGuard(changes > 0);

  const goTo = useCallback((id: string) => {
    if (!SECTIONS.some(([k]) => k === id)) return;
    setAcc((a) => ({ ...a, [id]: true }));
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" }), 40);
  }, []);

  // /app/rules#limits or #section=limits opens that section (and its accordion on a phone).
  const ready = Boolean(d);
  useEffect(() => {
    if (!ready) return;
    const raw = hash.replace(/^#/, "").toLowerCase();
    if (!raw) return;
    const id0 = new URLSearchParams(raw).get("section") ?? raw.split("&")[0];
    const id = SECTION_ALIAS[id0] ?? id0;
    if (!SECTIONS.some(([k]) => k === id)) return;
    const t = window.setTimeout(() => goTo(id), 0);
    return () => window.clearTimeout(t);
  }, [hash, ready, goTo]);

  const set = (patch: Partial<RulesDraft>) => {
    setJustSaved(false);
    setSaveErr(null);
    setD((cur) => (cur ? { ...cur, ...patch } : cur));
  };

  const save = async (): Promise<boolean> => {
    if (!saved || !d || !policy.data || saving) return false;
    setSaving(true);
    setSaveErr(null);
    try {
      const patch = policyPatch(policy.data, saved, d);
      const next = Object.keys(patch).length ? await commit(patch) : policy.data;
      const ex = await saveRulesExtras(extrasFrom(d));
      const nd = draftFrom(next, ex);
      setSaved(nd);
      setD(nd);
      setJustSaved(true);
      return true;
    } catch (err) {
      setSaveErr(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    if (saved) setD(saved);
    setSaveErr(null);
  };

  if (!d || !saved || !policy.data) {
    const err = policy.error ?? extras.error;
    return (
      <div className="zp-rules" style={{ display: "contents" }}>
        <PageHead
          title="Rules"
          lede="Every protection in one place. Changes reach every PC within about a minute and keep working offline. Employees see the active rules in their Zinwe window."
        />
        {err && !policy.pending && !extras.pending ? (
          <ErrorBlock
            title="We couldn't load your rules"
            message={errorMessage(err)}
            onRetry={() => {
              policy.reload();
              extras.reload();
            }}
          />
        ) : (
          <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="z-sr">Loading your rules…</span>
            <Sk w={420} h={34} style={{ borderRadius: 999, maxWidth: "100%" }} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="z-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <Sk w={140} h={18} />
                <Sk w="60%" h={12} />
                <Sk h={64} style={{ borderRadius: 12 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const p = policy.data;
  const accOf = (id: string) => ({ open: Boolean(acc[id]), onToggle: () => setAcc((a) => ({ ...a, [id]: !a[id] })) });

  // ---- Websites
  const catOn = (k: string) => d.cats.includes(k as never);
  const addMainSite = () => {
    const v = normSite(newSite);
    let err = siteError(v, "Type a site name, like example.com.");
    if (!err && d.sites.includes(v)) err = `${v} is already in your Custom sites.`;
    if (err) return setNewSiteErr(err);
    setNewSite("");
    setNewSiteErr("");
    set({ sites: [...d.sites, v], allow: d.allow.filter((x) => x !== v) });
  };

  // ---- Remote tools
  const removedSeeds = REMOTE_SEED.filter((s) => !d.tools.some((t) => t.id === s.id));
  const nOf = (m: ToolMode) => d.tools.filter((t) => t.mode === m).length;
  const setMode = (id: string, mode: ToolMode) => set({ tools: d.tools.map((x) => (x.id === id ? { ...x, mode } : x)) });
  const addTool = () => {
    const name = toolName.trim().replace(/\s+/g, " ");
    const exe = toolExe.trim();
    const err = { name: "", exe: "" };
    const lname = name.toLowerCase();
    if (!name) err.name = "Type the tool’s name.";
    else if (name.length > 40) err.name = "Keep the name under 40 characters.";
    else if (d.tools.some((t) => t.name.toLowerCase() === lname || t.agent.toLowerCase() === agentName(name).toLowerCase()))
      err.name = `${name} is already in the list.`;
    else if (removedSeeds.some((t) => t.name.toLowerCase() === lname || t.agent.toLowerCase() === agentName(name).toLowerCase()))
      err.name = `${name} is a tool Zinwe already knows. Use “Add back” above.`;
    if (exe && !EXE_RE.test(exe)) err.exe = "Use the app’s file name ending in .exe, like tool.exe (no folders).";
    else if (exe) {
      const dup = d.tools.find((t) => t.exe && t.exe.toLowerCase() === exe.toLowerCase());
      if (dup) err.exe = `${exe} is already in the list, as ${dup.name}.`;
    }
    if (err.name || err.exe) {
      setToolErr(err);
      if (!err.name && err.exe) setAdvOpen(true);
      window.setTimeout(() => document.getElementById(err.name ? "toolName" : "toolExe")?.focus(), 30);
      return;
    }
    setToolName("");
    setToolExe("");
    setToolErr({ name: "", exe: "" });
    set({ tools: [...d.tools, { id: toolId(exe || name), name, agent: agentName(name), what: "Added by you.", exe, custom: true, mode: "block" }] });
    setRToast(`${name} added as Block. Save to send it to every PC.`);
  };
  const toolKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTool();
    }
  };

  const leaving = guard.target !== null;
  const leaveName = guard.target?.kind === "link" && pageName(guard.target.to) ? `leave for ${pageName(guard.target.to)}` : "leave this page";
  const panelCat = panel ? CATEGORIES.find((c) => c.key === panel) : undefined;

  return (
    <div className={`zp-rules${changes > 0 ? " has-bar" : ""}`} style={{ display: "contents" }}>
      <PageHead
        title="Rules"
        lede="Every protection in one place. Changes reach every PC within about a minute and keep working offline. Employees see the active rules in their Zinwe window."
        actions={
          <span className="rl-mono rl-version">{versionLine(p)}</span>
        }
      />

      {changes > 0 ? (
        <div role="status" className="rl-savebar">
          <span>
            <b>{changes}</b> {changeWord} not saved yet{saveErr ? <span className="rl-bar-err"> · {saveErr}</span> : null}
          </span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="z-btn sm rl-ghost-dark" disabled={saving} onClick={discard}>
              Discard
            </button>
            <button type="button" className="z-btn sm pri" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save and send to PCs"}
            </button>
          </span>
        </div>
      ) : null}
      {justSaved && changes === 0 ? (
        <div role="status" style={{ background: "#E3F4EA", color: "#17663F", borderRadius: 12, padding: "12px 16px", fontWeight: 600 }}>
          Saved as version {p.version}. Every PC gets it within about a minute; a PC that's offline gets it when it's back online.
        </div>
      ) : null}

      <nav className="rl-jump" aria-label="Jump to a section">
        <span className="rl-k">Jump to</span>
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            className="rl-chip"
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              goTo(id);
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      {SAMPLES_ON ? (
      <Section id="hours" label="Work hours" sub="From the Start day, Take a break and End day buttons in each person's Zinwe window." {...accOf("hours")}>
        {has("work_time") ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <label htmlFor="breakOk" style={{ fontWeight: 600 }}>
                Ask for my OK on breaks longer than
              </label>
              <select id="breakOk" className="rl-inp" value={d.breakOk} onChange={(e) => set({ breakOk: e.target.value as RulesDraft["breakOk"] })}>
                <option value="0">Never ask</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
            <SwitchRow
              title="Ask for my OK when someone ends their day early"
              sub="Pressing End day before 6 PM on weekdays."
              on={d.earlyOk}
              label="Ask for my OK on an early End day"
              onChange={() => set({ earlyOk: !d.earlyOk })}
            />
          </>
        ) : (
          <PlanNote module="work_time">See when each person starts, takes breaks and ends their day, and OK long breaks.</PlanNote>
        )}
      </Section>
      ) : null}

      <Section
        id="web"
        label="Websites"
        title={
          <>
            Websites
            <Def tip={tip} id="webmode" aria="What Off, Watch only and Block & watch mean">
              <b>Watch only</b> shows which sites are used. Nothing is blocked.
              <br />
              <b>Block &amp; watch</b> blocks the kinds and sites you pick below, and records the rest.
            </Def>
          </>
        }
        sub="Site names only, never full addresses, page contents or searches."
        {...accOf("web")}
      >
        {has("web") ? (
          <>
            <div role="radiogroup" aria-label="Websites" className="rl-opts">
              {(
                [
                  ["off", "Off", "Nothing about websites is recorded."],
                  ["watch", "Watch only", "See which sites are used. Nothing is blocked."],
                  ["block", "Block & watch", "Block the kinds and sites below, record the rest."],
                ] as const
              ).map(([k, label, desc]) => (
                <OptCard key={k} on={d.web === k} label={label} desc={desc} onPick={() => set({ web: k as WebChoice })} />
              ))}
            </div>
            {d.web === "block" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #F0EDE6", paddingTop: 14 }}>
                <b id="cats-l">Block these kinds of sites</b>
                <div role="list" aria-labelledby="cats-l" style={{ display: "flex", flexDirection: "column", border: "1px solid #E7E3DA", borderRadius: 12 }}>
                  {CATEGORIES.map((c, i) => (
                    <div
                      key={c.key}
                      role="listitem"
                      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid #F0EDE6" : undefined }}
                    >
                      <Toggle
                        on={catOn(c.key)}
                        label={`Block ${c.label}`}
                        onChange={() => set({ cats: catOn(c.key) ? d.cats.filter((x) => x !== c.key) : CATEGORIES.map((x) => x.key).filter((k) => k === c.key || d.cats.includes(k)) })}
                      />
                      <span style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <b>{c.label}</b>
                        <br />
                        <span className="rl-k">{c.desc}</span>
                      </span>
                      {SAMPLES_ON && isApiCategory(c.key) ? (
                        <button type="button" id={`see-${c.key}`} className="z-btn sm" aria-haspopup="dialog" onClick={() => setPanel(c.key)}>
                          See the list<span className="z-sr"> of {c.label} sites</span>
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <b style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Custom sites
                  <Def tip={tip} id="custom" aria="What Custom sites means">
                    Sites you add yourself. They are blocked on every PC, on top of the kinds above.
                  </Def>
                </b>
                {d.sites.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {d.sites.map((name) => (
                      <span key={name} className="rl-tag rl-mono">
                        {name}
                        <button type="button" aria-label={`Unblock ${name}`} onClick={() => set({ sites: d.sites.filter((x) => x !== name) })}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label htmlFor="addSite" className="z-sr">
                    Site to block
                  </label>
                  <input
                    id="addSite"
                    className="rl-inp rl-mono"
                    style={{ width: 260 }}
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
                        addMainSite();
                      }
                    }}
                  />
                  <button type="button" className="z-btn sm" onClick={addMainSite}>
                    Block site
                  </button>
                </div>
                {newSiteErr ? (
                  <span id="addSite-err" role="alert" className="rl-err">
                    {newSiteErr}
                  </span>
                ) : null}
                {/* Always allowed isn't in the policy API yet (sample): not in production builds. */}
                {SAMPLES_ON ? (
                <>
                <b style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Always allowed
                  <Def tip={tip} id="allow" aria="What Always allowed means">
                    Sites that always open, even if a list above would block them. Use it when something is blocked by mistake.
                  </Def>
                </b>
                {d.allow.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {d.allow.map((name) => (
                      <span key={name} className="rl-tag rl-mono green">
                        {name}
                        <button type="button" aria-label={`Stop allowing ${name}`} onClick={() => set({ allow: d.allow.filter((x) => x !== name) })}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="rl-k">None yet. Open any list above and use “Allow a site” if something is blocked by mistake.</span>
                )}
                </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <PlanNote module="web">Block risky website categories or any site you choose.</PlanNote>
        )}
      </Section>

      <Section id="usb" label="USB & files" sub="Pen drives, external disks and phones. Keyboards, mice and chargers are never affected." {...accOf("usb")}>
        {has("usb_control") ? (
          <div role="radiogroup" aria-label="USB drives" className="rl-opts">
            {(
              [
                ["allow", "Allow", "USB works normally. Every copy is noted."],
                ["read_only", "Read-only", "Open files from a drive, but nothing can be copied onto it."],
                ["block", "Block", "Drives don’t open. Each try shows in Alerts."],
              ] as const
            ).map(([k, label, desc]) => (
              <OptCard key={k} on={d.usb === k} label={label} desc={desc} onPick={() => set({ usb: k as UsbMode })} />
            ))}
          </div>
        ) : (
          <PlanNote module="usb_control">Make pen drives read-only or block them on every PC.</PlanNote>
        )}
        <SwitchRow
          divided
          title="Include file names and email subjects in alerts"
          sub="Off protects privacy. Turn on only if your team knows and your policy allows it; each person is asked to agree again."
          on={d.names}
          label="Include file names"
          onChange={() => set({ names: !d.names })}
        />
      </Section>

      <Section id="limits" label="Limits" sub="Zinwe notes every transfer by size. It alerts you only when one copy or upload is over these limits." {...accOf("limits")}>
        {has("data_transfer") ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <SizeField id="usbLimit" label="USB copies, over" bytes={d.usbBytes} unit="MB" unitBytes={MB} min={1} onChange={(b) => set({ usbBytes: b })} />
              <SizeField id="netLimit" label="Shared folders, over" bytes={d.lanBytes} unit="GB" unitBytes={GB} min={0.01} onChange={(b) => set({ lanBytes: b })} />
              <SizeField id="emailLimit" label="Email attachments, over" bytes={d.emailBytes} unit="MB" unitBytes={MB} min={1} onChange={(b) => set({ emailBytes: b })} />
              {SAMPLES_ON ? (
                <SizeField id="upLimit" label="Web uploads, over" bytes={Math.round(d.upGb * GB)} unit="GB" unitBytes={GB} min={0.01} onChange={(b) => set({ upGb: Number((b / GB).toFixed(2)) })} />
              ) : null}
            </div>
            {d.usbBytes < 50 * MB ? <span className="rl-warn">A USB limit under 50 MB alerts on almost every copy, even photos.</span> : null}
            {d.emailBytes < 5 * MB ? <span className="rl-warn">An email limit under 5 MB alerts on most PDFs and photos.</span> : null}
            <SwitchRow
              divided
              title="Switch that PC to read-only when a USB copy goes over the limit"
              sub="Stops further copies straight away. Restore USB from the alert or the person's card."
              on={d.usbLock}
              label="Switch to read-only over the limit"
              onChange={() => set({ usbLock: !d.usbLock })}
            />
          </>
        ) : (
          <PlanNote module="data_transfer">Get an alert when a big copy leaves by USB, a shared folder, email or upload.</PlanNote>
        )}
      </Section>

      <Section
        id="remote"
        label="Remote tools"
        sub={`Remote-control apps. Choose ${SAMPLES_ON ? "Block, Watch or Allow" : "Block or Watch"} for each one. Zinwe sees that a session runs, never what happens inside it.`}
        {...accOf("remote")}
      >
        {has("remote_access") ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <b id="rt-l">Known tools · {d.tools.length}</b>
              <span className="rl-k">
                {nOf("block")} blocked · {nOf("watch")} watched{SAMPLES_ON ? ` · ${nOf("allow")} allowed` : ""}
              </span>
            </div>
            <div className="rl-rt-wrap">
              <table className="rl-rt" aria-labelledby="rt-l">
                <thead>
                  <tr>
                    <th scope="col">Tool</th>
                    <th scope="col">What it is</th>
                    <th scope="col">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        How it’s spotted
                        <Def tip={tip} id="spotted" aria="How Zinwe spots a tool">
                          Zinwe looks for the app by its name and by the network port it connects on. It never sees inside the session.
                        </Def>
                      </span>
                    </th>
                    <th scope="col">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {SAMPLES_ON ? "Block, watch or allow" : "Block or watch"}
                        <Def tip={tip} id="rstatus" aria={SAMPLES_ON ? "What Block, Watch and Allow mean" : "What Block and Watch mean"}>
                          <b>Block</b> closes it the moment it starts. The try shows in Alerts.
                          <br />
                          <b>Watch</b> lets it run. Every session shows in Alerts.
                          {SAMPLES_ON ? (
                            <>
                              <br />
                              <b>Allow</b> lets it run with no alert. Sessions are still listed on Apps &amp; remote.
                            </>
                          ) : null}
                        </Def>
                      </span>
                    </th>
                    <th scope="col">
                      <span className="z-sr">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.tools.map((t) => {
                    const ix = MODES.findIndex(([k]) => k === t.mode);
                    return (
                      <tr key={t.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <b>{t.name}</b>
                          {t.custom ? <span className="rl-ctag">Custom</span> : null}
                        </td>
                        <td data-l="What it is" style={{ color: "#3A352E" }}>
                          {t.what}
                        </td>
                        <td data-l="How it’s spotted" style={{ color: "#4A443C" }}>
                          {t.custom ? (t.exe ? `By app file ${t.exe}` : "By app name") : "By app name and network port"}
                        </td>
                        <td className="rl-act">
                          <span
                            role="radiogroup"
                            className="rl-s3g"
                            aria-label={`${t.name}: ${SAMPLES_ON ? "block, watch or allow" : "block or watch"}`}
                            onKeyDown={(e) => {
                              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                              if (!step) return;
                              e.preventDefault();
                              const next = MODES[(ix + step + MODES.length) % MODES.length][0];
                              setMode(t.id, next);
                              window.setTimeout(() => document.getElementById(`rm-${t.id}-${next}`)?.focus(), 30);
                            }}
                          >
                            {MODES.map(([k, label]) => (
                              <button
                                key={k}
                                type="button"
                                role="radio"
                                id={`rm-${t.id}-${k}`}
                                className={`rl-s3 ${k}${t.mode === k ? " on" : ""}`}
                                aria-checked={t.mode === k}
                                tabIndex={t.mode === k ? 0 : -1}
                                onClick={() => setMode(t.id, k)}
                              >
                                {label}
                              </button>
                            ))}
                          </span>
                        </td>
                        <td className="rl-act">
                          {/* Taking a built-in tool off the list is sample-only; your own tools can always go. */}
                          {SAMPLES_ON || t.custom ? (
                            <button type="button" className="z-btn sm" aria-label={`Remove ${t.name} from the list`} onClick={() => set({ tools: d.tools.filter((x) => x.id !== t.id) })}>
                              Remove
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {removedSeeds.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span className="rl-k">Add back:</span>
                {removedSeeds.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="rl-chip"
                    onClick={() => {
                      // Added back in its usual place, with the mode it had when saved, so remove + add back leaves no change.
                      const was = saved.tools.find((x) => x.id === s.id);
                      const row = was ?? { ...s, mode: "watch" as ToolMode, custom: false, exe: "" };
                      const order = REMOTE_SEED.map((x) => x.id);
                      const seeds = [...d.tools.filter((x) => !x.custom && order.includes(x.id)), row].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
                      set({ tools: [...seeds, ...d.tools.filter((x) => x.custom || !order.includes(x.id))] });
                    }}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #F0EDE6", paddingTop: 14 }}>
              <b>Add a tool</b>
              <span className="rl-k">For a remote-control app that isn’t listed. Its name is enough. New tools start as Block.</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label htmlFor="toolName" style={{ fontSize: 13, fontWeight: 600 }}>
                    Tool name
                  </label>
                  <input
                    id="toolName"
                    className="rl-inp"
                    style={{ width: 220, maxWidth: "100%" }}
                    placeholder="e.g. RemotePC"
                    value={toolName}
                    aria-invalid={Boolean(toolErr.name)}
                    aria-describedby="toolName-err"
                    onChange={(e) => {
                      setToolName(e.target.value);
                      setToolErr((x) => ({ ...x, name: "" }));
                    }}
                    onKeyDown={toolKey}
                  />
                </span>
                <button type="button" className="z-btn sm" onClick={addTool}>
                  Add tool
                </button>
              </div>
              {toolErr.name ? (
                <span id="toolName-err" role="alert" className="rl-err">
                  {toolErr.name}
                </span>
              ) : null}
              <button type="button" className="rl-adv" aria-expanded={advOpen} onClick={() => setAdvOpen(!advOpen)}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ transition: "transform .15s", transform: `rotate(${advOpen ? 90 : 0}deg)` }}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                Advanced
              </button>
              {advOpen ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 20 }}>
                  <label htmlFor="toolExe" style={{ fontSize: 13, fontWeight: 600 }}>
                    App file name{" "}
                    <span className="rl-k" style={{ fontWeight: 400 }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    id="toolExe"
                    className="rl-inp rl-mono"
                    style={{ width: 220, maxWidth: "100%" }}
                    placeholder="tool.exe"
                    value={toolExe}
                    aria-invalid={Boolean(toolErr.exe)}
                    aria-describedby="toolExe-help toolExe-err"
                    onChange={(e) => {
                      setToolExe(e.target.value);
                      setToolErr((x) => ({ ...x, exe: "" }));
                    }}
                    onKeyDown={toolKey}
                  />
                  <span id="toolExe-help" className="rl-k">
                    Add it if the tool often runs under another name, like a portable copy.
                  </span>
                  {toolErr.exe ? (
                    <span id="toolExe-err" role="alert" className="rl-err">
                      {toolErr.exe}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div role="status" aria-live="polite" className={rToast ? "rl-toast on" : "rl-toast"}>
                {rToast}
              </div>
            </div>
          </>
        ) : (
          <PlanNote module="remote_access">Spot and block remote-control tools like AnyDesk, and see new software installs.</PlanNote>
        )}
      </Section>

      {SAMPLES_ON ? (
      <Section id="software" label="Software" sub="Program names and versions only, never what's done in them." {...accOf("software")}>
        {has("software_installs") ? (
          <SwitchRow
            title="New-software alerts"
            sub="An alert the day a program is installed. It shows as Worth a look."
            on={d.soft}
            label="New-software alerts"
            onChange={() => set({ soft: !d.soft })}
          />
        ) : (
          <PlanNote module="software_installs">Get an alert the day a program is installed on any PC.</PlanNote>
        )}
      </Section>
      ) : null}

      {SAMPLES_ON && panelCat && isApiCategory(panelCat.key) ? (
        <CategoryPanel
          cat={panelCat.key}
          label={panelCat.label}
          on={catOn(panelCat.key)}
          sites={d.sites}
          allow={d.allow}
          onClose={() => setPanel(null)}
          onBlock={(v) => {
            const wasAllowed = d.allow.includes(v);
            set({ sites: [...d.sites, v], allow: d.allow.filter((x) => x !== v) });
            return `Blocked ${v}. It’s in Custom sites${wasAllowed ? " and no longer always allowed" : ""}. Save to send it to every PC.`;
          }}
          onAllow={(v) => {
            const wasCustom = d.sites.includes(v);
            set({ allow: [...d.allow, v], sites: d.sites.filter((x) => x !== v) });
            return `Allowed ${v}${wasCustom ? " and took it off Custom sites" : ""}. Save to send it to every PC.`;
          }}
        />
      ) : null}

      <Sheet open={leaving} title="You have unsaved changes" sub={`${changes} ${changeWord} to ${leaveName}`} onClose={guard.stay}>
        <div data-leave-guard className="zn-sheet-acts">
          <button type="button" className="z-btn" onClick={guard.stay}>
            Stay
          </button>
          <button
            type="button"
            className="z-btn"
            onClick={() => {
              discard();
              guard.proceed();
            }}
          >
            Discard
          </button>
          <button
            type="button"
            className="z-btn pri"
            disabled={saving}
            onClick={() => {
              guard.hold();
              void save().then((ok) => {
                if (ok) guard.proceed();
                else guard.stay();
              });
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saveErr ? (
          <p className="z-err" role="alert" style={{ margin: 0 }}>
            {saveErr}
          </p>
        ) : null}
      </Sheet>
      {tip.node}
    </div>
  );
}
