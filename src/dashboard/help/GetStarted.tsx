import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { browserNotifyOn, notifyPermission } from "../features/browserNotify";
import { startTour } from "../features/tour";
import { useShell } from "../shell/shellContext";
import { ZIcon } from "../ui/ZIcon";

interface Step {
  key: "add" | "install" | "rules" | "notify" | "report";
  title: string;
  body: string;
  to: string;
  cta: string;
}

const STEPS: readonly Step[] = [
  { key: "add", title: "Add your team", body: "Each person gets a Member ID by email.", to: "/app/team", cta: "Team & PCs" },
  { key: "install", title: "Install Zinwe on their PCs", body: "About 5 minutes per PC. They agree on their own PC.", to: "/download", cta: "Download" },
  { key: "rules", title: "Set your rules", body: "USB, websites, file limits and remote-control apps.", to: "/app/rules", cta: "Rules" },
  { key: "notify", title: "Turn on notifications", body: "So break requests and urgent alerts never wait.", to: "/app/settings/notifications", cta: "Settings" },
  { key: "report", title: "Schedule a weekly report", body: "A PDF in your inbox every Monday.", to: "/app/reports", cta: "Reports" },
];

type Marks = Partial<Record<Step["key"], boolean>>;

const key = (userId: number | undefined) => `zinwe.help.setup.${userId ?? "me"}`;

function readMarks(userId: number | undefined): Marks {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Marks) : {};
  } catch {
    return {};
  }
}

function writeMarks(userId: number | undefined, marks: Marks): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(marks));
  } catch {
    /* storage blocked: the ticks last until reload */
  }
}

/**
 * Help → Get started (board DashHelp): "Get fully set up" in five steps. A step ticks itself when the data says so
 * (someone added, a PC connected, notifications on in this browser); the owner can tick or untick any step
 * (remembered on this browser). Then the tour and the website.
 */
export function GetStarted({ userId }: { userId: number | undefined }): ReactElement {
  const { members } = useShell();
  const [marks, setMarks] = useState<Marks>(() => readMarks(userId));
  const active = (members ?? []).filter((m) => m.is_active);
  const auto: Marks = {
    add: active.length > 0,
    install: active.some((m) => m.device !== null),
    notify: notifyPermission() === "granted" && browserNotifyOn(),
  };
  const done = (k: Step["key"]) => marks[k] ?? auto[k] ?? false;
  const n = STEPS.filter((s) => done(s.key)).length;

  const flip = (k: Step["key"]) => {
    const next = { ...marks, [k]: !done(k) };
    setMarks(next);
    writeMarks(userId, next);
  };

  return (
    <>
      <section className="z-card zp-card" aria-labelledby="gs-h" style={{ gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <h2 id="gs-h" style={{ fontSize: 18 }}>
            Get fully set up
          </h2>
          <span style={{ fontWeight: 600 }}>
            {n} of {STEPS.length} done
          </span>
        </div>
        <div className="zh-prog" aria-hidden="true">
          <span style={{ width: `${Math.round((n / STEPS.length) * 100)}%` }} />
        </div>
        <ol className="zh-steps">
          {STEPS.map((s) => {
            const d = done(s.key);
            return (
              <li key={s.key} className="zh-step">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={d}
                  aria-label={`Mark ${s.title} done`}
                  className={`zhp-box${d ? " on" : ""}`}
                  onClick={() => flip(s.key)}
                >
                  {d ? <ZIcon name="check" size={16} stroke={3} /> : null}
                </button>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b className={d ? "zh-done" : undefined}>{s.title}</b>
                  <br />
                  <span className="zp-body">{s.body}</span>
                </span>
                <Link className="z-btn sm" to={s.to}>
                  {s.cta}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="z-card zp-card" aria-labelledby="tour-h" style={{ gap: 12 }}>
        <h2 id="tour-h" style={{ fontSize: 18 }}>
          Find your way around
        </h2>
        <span className="zp-body">A one-minute tour of the dashboard, or the guides and plans on the Zinwe website.</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="z-btn sm dark" onClick={startTour}>
            <ZIcon name="help" size={16} />
            Take the tour
          </button>
          <a className="z-btn sm" href="/" target="_blank" rel="noreferrer">
            <ZIcon name="external" size={16} />
            Zinwe website
          </a>
        </div>
      </section>
    </>
  );
}
