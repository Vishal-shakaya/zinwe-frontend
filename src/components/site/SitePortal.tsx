import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import {
  ALERTS,
  MSGS0,
  NEEDS,
  OTHER_CHATS,
  PEOPLE,
  PERSON_HOURS,
  PERSON_TONE,
  RAW_LOG,
  STAGES,
  TAB_ICON,
  TAB_LABEL,
  TAB_ORDER,
  TAB_ROUTE,
  TASKS0,
  TASK_COLUMNS,
  TOP_APPS,
  TOUR_STEP_MS,
  WEEK_DAYS,
  WEEK_HOURS,
  type DemoMessage,
  type DemoTab,
  type DemoTask,
  type TaskStage,
} from "../../content/site/portalDemo";
import { useIsPhone } from "../../hooks/useIsPhone";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { cx } from "../../lib/cx";
import { ICONS } from "./icons";
import { PathIcon, PauseGlyph, PlayGlyph } from "./SiteIcon";
import { Brand } from "../ui/Brand";
import "../../styles/site-portal.css";

function Avatar({ ini, size }: { ini: string; size: 22 | 24 | 26 | 30 }): ReactElement {
  return (
    <span aria-hidden="true" className={cx("zp-av", `zp-av--${size}`, `tone-${PERSON_TONE[ini] ?? "grey"}`)}>
      {ini}
    </span>
  );
}

/**
 * The live dashboard window in the Home hero (board SitePortal): a working slice of the owner dashboard on sample
 * data. Visitors click the menu; until they do it moves on by itself every 7 seconds — only while it is on screen,
 * never under the pointer, never with reduced motion — and Pause / Play tour stops and starts it (WCAG 2.2.2).
 * A click on the menu (or any button) hands control to the visitor. Every button does what it says, locally.
 */
export function SitePortal({ start = "overview", autoplay = true }: { start?: DemoTab; autoplay?: boolean }): ReactElement {
  const reduce = usePrefersReducedMotion();
  // ≤ 900 px the menu is a tab row (site-portal.css); the same width turns the tour off.
  const phone = useIsPhone(900);
  // On a phone the window shows one page at a time under a swipeable tab row, and never changes page by itself:
  // a tour there would make the page jump under the reader's thumb.
  const canAuto = autoplay && !reduce && !phone;
  const [tab, setTab] = useState<DemoTab>(start);
  const [manual, setManual] = useState(false);
  const [msgs, setMsgs] = useState<readonly DemoMessage[]>(MSGS0);
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<readonly DemoTask[]>(TASKS0);
  const [needsDone, setNeedsDone] = useState<Record<string, boolean>>({});
  const [fine, setFine] = useState<Record<string, "ask" | "fine">>({});
  const [onScreen, setOnScreen] = useState(true);
  const [hovered, setHovered] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(10);
  const timers = useRef<number[]>([]);
  const elapsed = useRef(0);
  const live = useRef({ manual, hovered, onScreen });
  useEffect(() => {
    live.current = { manual, hovered, onScreen };
  }, [manual, hovered, onScreen]);

  // The tour only runs while the window is on screen (35 % visible).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !canAuto || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries[0].isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [canAuto]);

  // Counts only the time the pointer is away and the window is on screen, so the progress line and the switch agree.
  useEffect(() => {
    if (!canAuto) return;
    const t = window.setInterval(() => {
      const s = live.current;
      if (s.manual || s.hovered || !s.onScreen) return;
      elapsed.current += 100;
      if (elapsed.current < TOUR_STEP_MS) return;
      elapsed.current = 0;
      setTab((cur) => TAB_ORDER[(TAB_ORDER.indexOf(cur) + 1) % TAB_ORDER.length]);
    }, 100);
    return () => window.clearInterval(t);
  }, [canAuto]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  // Phone: keep the open page's tab in view inside the tab row (the row scrolls sideways, the page does not).
  useEffect(() => {
    const row = sideRef.current;
    const el = document.getElementById(`zp-tab-${tab}`);
    if (!phone || !row || !el) return;
    const left = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - 12;
    row.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [tab, phone, reduce]);

  // New messages scroll into view inside the chat log (not the page).
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [msgs, tab]);

  const takeOver = () => setManual(true);
  const pick = (next: DemoTab) => {
    setTab(next);
    setManual(true);
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TAB_ORDER[(TAB_ORDER.indexOf(tab) + step + TAB_ORDER.length) % TAB_ORDER.length];
    pick(next);
    document.getElementById(`zp-tab-${next}`)?.focus();
  };

  const send = (asTask: boolean) => {
    const text = draft.trim();
    if (!text) return;
    const id = nextId.current++;
    const msg: DemoMessage = asTask
      ? { id, kind: "task", text, due: "Today", stage: 0 }
      : { id, kind: "text", me: true, text, time: "2:21 PM", receipt: "Sent" };
    setMsgs((m) => [...m, msg]);
    setDraft("");
    takeOver();
    // Delivered once her PC has it, Seen once she opens the chat (a task moves to Seen the same way).
    const bump = (receipt: string, stage: number) =>
      setMsgs((m) => m.map((x) => (x.id !== id ? x : x.kind === "task" ? { ...x, stage } : { ...x, receipt })));
    timers.current.push(window.setTimeout(() => bump("Delivered", 0), 1200));
    timers.current.push(window.setTimeout(() => bump("Seen", 1), 2600));
  };

  const move = (id: number, stage: TaskStage) => {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, stage } : t)));
    takeOver();
  };

  const reviewCount = tasks.filter((t) => t.stage === "review").length;
  const openTasks = tasks.filter((t) => t.stage !== "done").length + 5;
  const mostMins = Math.max(...PERSON_HOURS.map((p) => p.mins));
  const alertsOpen = ALERTS.length - Object.keys(fine).length;
  const badges: Record<DemoTab, { n: number; tone: string }> = {
    overview: { n: 0, tone: "" },
    chat: { n: 2, tone: "dark" },
    tasks: { n: openTasks, tone: "soft" },
    reports: { n: 0, tone: "" },
    alerts: { n: alertsOpen, tone: "red" },
  };
  const autoOn = canAuto && !manual;
  const lastMsg = msgs[msgs.length - 1];

  return (
    <div className="zp" ref={rootRef}>
      <div className={cx("zp-win", (hovered || !onScreen) && "is-held")} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {/* Window bar: the address of the page shown. */}
        <div className="zp-bar">
          <span className="zp-brand">
            <Brand variant="static" height={20} />
          </span>
          <span className="zp-url zs-mono">
            <span>
              <PathIcon d={ICONS.lock} size={11} stroke={2.4} />
              app.zinwe.io/{TAB_ROUTE[tab]}
            </span>
          </span>
          <span className="zp-bar__end">
            {canAuto ? (
              <button
                type="button"
                className="zp-b zp-b--tour"
                aria-pressed={manual}
                onClick={() => {
                  elapsed.current = 0;
                  setManual((m) => !m);
                }}
              >
                {manual ? <PlayGlyph size={11} /> : <PauseGlyph size={11} />}
                {manual ? "Play tour" : "Pause"}
              </button>
            ) : null}
          </span>
        </div>

        <div className="zp-body">
          {/* The same menu as the real dashboard, cut down to the five places owners use most. */}
          <div className="zp-side" ref={sideRef} role="tablist" aria-label="Dashboard pages" aria-orientation={phone ? "horizontal" : "vertical"}>
            <div className="zp-co">
              <span className="zp-av zp-av--30 tone-ink" aria-hidden="true">
                AR
              </span>
              <span className="zp-co__who">
                <b>Ananya Rao</b>
                <span>Owner · Kitecrest</span>
              </span>
            </div>
            {TAB_ORDER.map((key) => {
              const on = key === tab;
              const badge = badges[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`zp-tab-${key}`}
                  aria-selected={on}
                  aria-controls="zp-panel"
                  tabIndex={on ? 0 : -1}
                  className={cx("zp-tab", on && "is-on", on && autoOn && "is-auto")}
                  onClick={() => pick(key)}
                  onKeyDown={onTabKey}
                >
                  <PathIcon d={TAB_ICON[key]} size={17} stroke={1.9} />
                  <span className="zp-tab__label">{TAB_LABEL[key]}</span>
                  {badge.n > 0 ? <span className={cx("zp-badge zs-num", `zp-badge--${badge.tone}`)}>{badge.n}</span> : null}
                </button>
              );
            })}
          </div>

          <div id="zp-panel" role="tabpanel" aria-labelledby={`zp-tab-${tab}`} className="zp-main">
            {tab === "overview" ? (
              <div className="zp-fade zp-stack">
                <div className="zp-headrow">
                  <div>
                    <span className="zp-lbl">Wednesday, 28 October</span>
                    <h3 className="zp-h3">Good afternoon, Ananya</h3>
                  </div>
                  <button type="button" className="zp-b zp-b--pri" onClick={() => pick("tasks")}>
                    Send a task
                  </button>
                </div>
                <div className="zp-tiles">
                  {[
                    { label: "Working now", value: "9", sub: "of 12 people", cls: "is-green" },
                    { label: "On a break", value: "1", sub: "Emily, 42 min", cls: "is-amber" },
                    { label: "Alerts to check", value: String(alertsOpen + 2), sub: "since this morning", cls: "is-red" },
                    { label: "Open tasks", value: String(openTasks), sub: `${reviewCount} waiting for you`, cls: "" },
                  ].map((k) => (
                    <div key={k.label} className="zp-card zp-tile">
                      <span className="zp-tile__l">{k.label}</span>
                      <b className={cx("zp-tile__v zs-num", k.cls)}>{k.value}</b>
                      <span className="zp-tile__s">{k.sub}</span>
                    </div>
                  ))}
                </div>
                <div className="zp-two">
                  <section className="zp-card zp-list">
                    <b className="zp-list__h">Needs you</b>
                    {NEEDS.map((n) => {
                      const done = !!needsDone[n.id];
                      return (
                        <div key={n.id} className="zp-need">
                          <span className={cx("zp-ico zp-ico--28", `tone-${n.tone}`)} aria-hidden="true">
                            <PathIcon d={n.icon} size={14} />
                          </span>
                          <span className="zp-need__t">
                            <b>{n.title}</b>
                            <span>{n.meta}</span>
                          </span>
                          {done ? (
                            <span className="zp-b zp-b--done">{n.done} ✓</span>
                          ) : (
                            <button
                              type="button"
                              className={cx("zp-b", n.btn === "Approve" ? "zp-b--pri" : "zp-b--dark")}
                              onClick={() => {
                                setNeedsDone((d) => ({ ...d, [n.id]: true }));
                                takeOver();
                              }}
                            >
                              {n.btn}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </section>
                  <section className="zp-card zp-list zp-list--tight">
                    <b className="zp-list__h">Team today</b>
                    {PEOPLE.map((p) => (
                      <div key={p.ini} className="zp-person">
                        <Avatar ini={p.ini} size={26} />
                        <b>{p.name}</b>
                        <span className={cx("zp-pill", `tone-${p.tone}`)}>
                          {p.ini === "EC" && needsDone.n2 ? "Break approved" : p.status}
                        </span>
                        <span className="zp-person__time zs-num">{p.time}</span>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            ) : null}

            {tab === "chat" ? (
              <div className="zp-fade zp-chat">
                <div className="zp-chatlist zp-card">
                  {[{ ini: "PN", name: "Priya Nair", last: lastMsg.text, unread: false }, ...OTHER_CHATS].map((c, i) => (
                    <div key={c.ini} className={cx("zp-chatrow", i === 0 && "is-on")}>
                      <Avatar ini={c.ini} size={30} />
                      <span className="zp-chatrow__t">
                        <b>{c.name}</b>
                        <span>{c.last}</span>
                      </span>
                      {c.unread ? <span className="zp-unread" aria-label="unread" /> : null}
                    </div>
                  ))}
                </div>
                <div className="zp-card zp-thread">
                  <div className="zp-thread__head">
                    <Avatar ini="PN" size={30} />
                    <span className="zp-thread__who">
                      <b>Priya Nair</b>
                      <span>
                        <span className="zp-online" aria-hidden="true" />
                        At her PC · KC-ACCOUNTS-01
                      </span>
                    </span>
                  </div>
                  <div className="zp-log" role="log" aria-label="Messages with Priya" ref={logRef}>
                    <span className="zp-day">Today</span>
                    {msgs.map((m) =>
                      m.kind === "task" ? (
                        <div key={m.id} className="zp-taskmsg">
                          <span className="zp-taskmsg__k">
                            <PathIcon d={["M4 4h16v16H4z", "M8.5 12.5l2.5 2.5 4.5-5"]} size={13} stroke={2.2} />
                            TASK
                          </span>
                          <b>{m.text}</b>
                          <span className="zp-taskmsg__pills">
                            <span className="zp-pill tone-amber">Due {m.due}</span>
                            <span className={cx("zp-pill", m.stage >= 2 ? "tone-orange" : "tone-stone")}>{STAGES[m.stage]}</span>
                          </span>
                          <div className="zp-stages" aria-label={`Progress: ${STAGES[m.stage]}`}>
                            {STAGES.map((label, i) => (
                              <span key={label} className={cx("zp-stage", i < m.stage && "is-past", i === m.stage && "is-now")}>
                                <span className="zp-stage__bar" />
                                <span className="zp-stage__l">{label}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className={cx("zp-msg", m.me && "is-me")}>
                          <div className="zp-msg__b">{m.text}</div>
                          <span className="zp-msg__meta">{m.me ? `${m.time} · ${m.receipt ?? ""}` : m.time}</span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="zp-compose">
                    <label htmlFor="zp-draft" className="zs-sr">
                      Message Priya
                    </label>
                    <input
                      id="zp-draft"
                      className="zp-in"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") send(false);
                      }}
                      onFocus={takeOver}
                      placeholder={phone ? "Message Priya" : "Message Priya, or type a task"}
                      autoComplete="off"
                    />
                    <button type="button" className="zp-b" onClick={() => send(true)} title="Send as a task">
                      + Task
                    </button>
                    <button type="button" className="zp-b zp-b--dark" onClick={() => send(false)}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "tasks" ? (
              <div className="zp-fade zp-stack zp-stack--12">
                <div className="zp-headrow zp-headrow--center">
                  <div>
                    <h3 className="zp-h3 zp-h3--sm">Tasks</h3>
                    <span className="zp-sub">Sent from Chat or here, ticked off in each person's Zinwe app.</span>
                  </div>
                  <span className="zp-pills">
                    <span className="zp-pill tone-green">{reviewCount} waiting for your OK</span>
                    <span className="zp-pill tone-red">1 overdue</span>
                  </span>
                </div>
                <div className="zp-cols">
                  {TASK_COLUMNS.map(([key, label]) => {
                    const items = tasks.filter((t) => t.stage === key);
                    return (
                      <section key={key} className="zp-col" aria-label={label}>
                        <div className="zp-col__h">
                          <b>{label}</b>
                          <span className="zs-num">{items.length}</span>
                        </div>
                        {items.map((t) => (
                          <div key={t.id} className="zp-card zp-task zp-fade">
                            <b>{t.title}</b>
                            <span className="zp-task__meta">
                              <Avatar ini={t.ini} size={22} />
                              <span className={cx("zp-pill", t.late ? "tone-red" : key === "done" ? "tone-green" : "tone-grey")}>{t.due}</span>
                              {t.steps ? <span className="zp-pill zs-num tone-grey">{t.steps}</span> : null}
                            </span>
                            {key === "review" ? (
                              <span className="zp-task__acts">
                                <button type="button" className="zp-b zp-b--pri zp-b--grow" onClick={() => move(t.id, "done")}>
                                  Approve
                                </button>
                                <button type="button" className="zp-b" onClick={() => move(t.id, "progress")}>
                                  Reopen
                                </button>
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tab === "reports" ? (
              <div className="zp-fade zp-stack zp-stack--12">
                <div className="zp-headrow zp-headrow--center">
                  <div>
                    <h3 className="zp-h3 zp-h3--sm">Reports · last 7 days</h3>
                    <span className="zp-sub">Thu 22 Oct to Wed 28 Oct · everyone</span>
                  </div>
                  <span className="zp-pills">
                    <button type="button" className="zp-b" onClick={takeOver}>
                      Download PDF
                    </button>
                    <button type="button" className="zp-b" onClick={takeOver}>
                      Email weekly
                    </button>
                  </span>
                </div>
                <div className="zp-two zp-two--260">
                  <section className="zp-card zp-list zp-list--chart">
                    <b className="zp-list__h zp-list__h--14">Hours worked, whole team</b>
                    <div
                      className="zp-week"
                      role="img"
                      aria-label={`Team hours: ${WEEK_HOURS.map((h, i) => `${WEEK_DAYS[i]} ${h} hours`).join(", ")}`}
                    >
                      {WEEK_HOURS.map((h, i) => (
                        <span key={WEEK_DAYS[i]} className="zp-week__col">
                          <span className="zp-week__n zs-num">{h ? `${h}h` : "—"}</span>
                          <span
                            className={cx("zp-week__bar", i === WEEK_HOURS.length - 1 && "is-today")}
                            style={{ height: `${Math.max(2, Math.round((h / 66) * 130))}px` }}
                          />
                        </span>
                      ))}
                    </div>
                    <div className="zp-week__days" aria-hidden="true">
                      {WEEK_DAYS.map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                  </section>
                  <section className="zp-card zp-list zp-list--perf">
                    <div className="zp-perf__h">
                      <b>Hours per person</b>
                    </div>
                    {PERSON_HOURS.map((p) => (
                      <div key={p.ini} className="zp-perf">
                        <Avatar ini={p.ini} size={24} />
                        <span className="zp-perf__main">
                          <span className="zp-perf__line">
                            <b>{p.name}</b>
                            <span className="zs-num">{p.hours}</span>
                          </span>
                          <span className="zp-meter">
                            <span className="zp-meter__fill" style={{ width: `${Math.round((p.mins / mostMins) * 100)}%` }} />
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="zp-next">
                      <b>Top apps this week:</b> {TOP_APPS}.
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {tab === "alerts" ? (
              <div className="zp-fade zp-stack zp-stack--12">
                <div>
                  <h3 className="zp-h3 zp-h3--sm">Alerts, in plain English</h3>
                  <span className="zp-sub">What happened, what it means and one button for what to do.</span>
                </div>
                <div className="zp-raw">
                  <span className="zs-mono">WHAT THE PC LOGGED</span>
                  <code className="zs-mono">{RAW_LOG}</code>
                </div>
                {ALERTS.map((a) => {
                  const st = fine[a.id];
                  return (
                    <div key={a.id} className={cx("zp-card zp-alert", st && "is-closed")}>
                      <span className={cx("zp-ico zp-ico--34", `tone-${a.tone}`)} aria-hidden="true">
                        <PathIcon d={a.icon} size={16} />
                      </span>
                      <span className="zp-alert__t">
                        <span className="zp-alert__title">
                          <b>{a.title}</b>
                          <span className={cx("zp-pill", `tone-${a.tone}`)}>{a.level}</span>
                        </span>
                        <span className="zp-alert__body">{a.body}</span>
                      </span>
                      <span className="zp-alert__acts">
                        {st ? (
                          <span className="zp-b zp-b--done">{st === "ask" ? "Message sent ✓" : "Marked as fine ✓"}</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="zp-b zp-b--dark"
                              onClick={() => {
                                setFine((f) => ({ ...f, [a.id]: "ask" }));
                                takeOver();
                              }}
                            >
                              {a.action}
                            </button>
                            <button
                              type="button"
                              className="zp-b"
                              onClick={() => {
                                setFine((f) => ({ ...f, [a.id]: "fine" }));
                                takeOver();
                              }}
                            >
                              Mark as fine
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
