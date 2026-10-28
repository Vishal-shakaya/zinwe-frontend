import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";

export interface SetupStep {
  label: string;
  done: boolean;
}

const HIDE_KEY = "zinwe.overview.setupHidden";

function readHidden(): boolean {
  try {
    return sessionStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Finish setting up (DashOverview): shown at the top until every step is done (same steps as Help → Get started).
 * Hide for now dismisses it for this browser session.
 */
export function SetupCard({ steps }: { steps: SetupStep[] }): ReactElement | null {
  const [hidden, setHidden] = useState(readHidden);
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (hidden || done >= total) return null;
  const next = steps.filter((s) => !s.done).map((s) => s.label);
  const line = `${done} of ${total} steps done`;
  return (
    <section className="z-card zn-ov-setup" aria-labelledby="setup-h">
      <div className="zn-ov-setup-main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 12px" }}>
          <h2 id="setup-h" style={{ margin: 0, fontSize: 17 }}>
            Finish setting up
          </h2>
          <span className="z-num" style={{ fontSize: 13, fontWeight: 600, color: "#3A352E" }}>
            {line}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-valuetext={line}
          className="zn-ov-bar"
        >
          <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
        <span style={{ fontSize: 13, color: "#4A443C" }}>{next.length ? `Next: ${next.join(", then ")}.` : ""}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Link className="z-btn sm pri" to="/app/help#tab=get-started">
          Continue setup
        </Link>
        <button
          type="button"
          className="z-btn sm"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(HIDE_KEY, "1");
            } catch {
              /* storage blocked: hidden until reload */
            }
          }}
        >
          Hide for now
        </button>
      </div>
    </section>
  );
}
