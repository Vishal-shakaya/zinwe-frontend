import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import { AGENT_MSI_URL } from "../../content/download";
import { consentOf } from "../features/memberStatus";
import { ZIcon, type IconName } from "../ui/ZIcon";

interface Step {
  title: string;
  body: string;
  icon: IconName;
  done: boolean;
}

/**
 * The first-run card on Overview (J5-06, J3-13): the four steps from sign-up to a protected PC, ticking off
 * as they happen, with one main button for the next step and "N of M PCs connected". Shown until the
 * first person has agreed on their PC.
 */
export function GetProtected({
  members,
  maxDevices,
  rulesChanged,
}: {
  /** Active members. */
  members: Member[];
  /** The plan's PC limit (0 = no limit). */
  maxDevices: number;
  /** The owner has changed a protection rule (the policy is past its first version). */
  rulesChanged: boolean;
}): ReactElement {
  const connected = members.filter((m) => m.device).length;
  const agreed = members.filter((m) => consentOf(m.device) === "given").length;
  const firstWaiting = members.find((m) => !m.device);
  const waitingName = firstWaiting ? firstWaiting.name.trim().split(/\s+/)[0] || firstWaiting.name : null;

  const steps: Step[] = [
    {
      title: "Add your first person",
      body: "Their name and work email. Zinwe gives each person their own ID and emails it to them.",
      icon: "team",
      done: members.length > 0,
    },
    {
      title: "Install Zinwe on their PC",
      body: "Download Zinwe on their Windows PC, run it, and enter their email and ID. It shows up here within about a minute.",
      icon: "pc",
      done: connected > 0,
    },
    {
      title: "They agree on their PC",
      body: "They read what Zinwe shares with you and choose “I agree”. Protection starts then — nothing is collected before.",
      icon: "check",
      done: agreed > 0,
    },
    {
      title: "Choose what to protect",
      body: "Online protection, Data safety and App monitoring start with safe settings. Change them any time.",
      icon: "protection",
      done: rulesChanged,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="z-card zn-gp" aria-labelledby="gp-title">
      <div className="zn-gp-head">
        <div style={{ minWidth: 0 }}>
          <h2 id="gp-title" style={{ margin: 0, fontSize: 17 }}>
            Get protected in four steps
          </h2>
          <span style={{ fontSize: 13, color: "#4A443C" }}>
            About 5 minutes per PC. No IT skills needed. ·{" "}
            <b className="z-num">
              {maxDevices > 0 ? `${connected} of ${maxDevices} PCs connected` : `${connected} ${connected === 1 ? "PC" : "PCs"} connected`}
            </b>
          </span>
        </div>
        <span className="z-pill orange z-num" aria-label={`${doneCount} of 4 steps done`}>
          {doneCount} of 4 done
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={doneCount}
        className="zn-ov-bar"
      >
        <span style={{ width: `${doneCount * 25}%` }} />
      </div>

      <ol className="zn-gp-steps">
        {steps.map((step, i) => (
          <li key={step.title} className={cx("zn-gp-step", step.done && "is-done", i === next && "is-next")}>
            <span className="zn-gp-num" aria-hidden="true">
              {step.done ? <ZIcon name="check" size={14} stroke={2.6} /> : i + 1}
            </span>
            <span className="zn-gp-text">
              <b>
                {step.title}
                {step.done ? <span className="z-sr"> (done)</span> : null}
              </b>
              <small>{step.body}</small>
            </span>
          </li>
        ))}
      </ol>

      <div className="zn-gp-acts">
        {next === 0 || next === -1 ? (
          <Link className="z-btn sm pri" to="/app/team#add=1">
            <ZIcon name="plus" size={15} stroke={2.2} />
            Add your first person
          </Link>
        ) : next === 1 ? (
          <>
            <a className="z-btn sm pri" href={AGENT_MSI_URL} download>
              <ZIcon name="download" size={15} stroke={2.2} />
              Download Zinwe (Windows)
            </a>
            <Link className="z-btn sm" to="/app/team">
              {waitingName ? `Share ${waitingName}'s ID` : "Open Team & PCs"}
            </Link>
          </>
        ) : next === 2 ? (
          <Link className="z-btn sm pri" to="/app/team">
            <ZIcon name="team" size={15} />
            See who still needs to agree
          </Link>
        ) : (
          <Link className="z-btn sm pri" to="/app/rules">
            <ZIcon name="protection" size={15} />
            Set up protection
          </Link>
        )}
        {next > 0 ? (
          <Link to="/app/team#add=1" style={{ fontSize: 13, fontWeight: 600 }}>
            Add another person
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default GetProtected;
