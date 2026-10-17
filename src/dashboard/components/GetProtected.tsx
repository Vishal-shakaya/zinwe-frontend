import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Member } from "../../lib/api";
import { cx } from "../../lib/cx";
import { AGENT_MSI_URL } from "../../content/download";
import { consentOf } from "../features/memberStatus";
import { DashIcon, type DashIconName } from "./DashIcon";

interface Step {
  title: string;
  body: string;
  icon: DashIconName;
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
      icon: "shield",
      done: rulesChanged,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="dash-card gp" aria-labelledby="gp-title">
      <div className="dash-card__head dash-card__head--split">
        <div>
          <h2 className="dash-card__title" id="gp-title">
            Get protected in four steps
          </h2>
          <p className="dash-card__sub">
            About 5 minutes per PC. No IT skills needed. ·{" "}
            <b>
              {maxDevices > 0 ? `${connected} of ${maxDevices} PCs connected` : `${connected} ${connected === 1 ? "PC" : "PCs"} connected`}
            </b>
          </p>
        </div>
        <span className="gp__count" aria-label={`${doneCount} of 4 steps done`}>
          {doneCount}/4
        </span>
      </div>

      <ol className="gp__steps">
        {steps.map((step, i) => (
          <li key={step.title} className={cx("gp__step", step.done && "is-done", i === next && "is-next")}>
            <span className="gp__num" aria-hidden="true">
              {step.done ? <DashIcon name="check" /> : i + 1}
            </span>
            <span className="gp__text">
              <b>
                {step.title}
                {step.done ? <span className="dash-sr"> (done)</span> : null}
              </b>
              <small>{step.body}</small>
            </span>
          </li>
        ))}
      </ol>

      <div className="gp__actions">
        {next === 0 || next === -1 ? (
          <Link className="btn btn--primary" to="/app/team?add=1">
            <DashIcon name="plus" />
            Add your first person
          </Link>
        ) : next === 1 ? (
          <>
            <a className="btn btn--primary" href={AGENT_MSI_URL} download>
              <DashIcon name="download" />
              Download Zinwe (Windows)
            </a>
            <Link className="btn btn--ghost" to="/app/team">
              {waitingName ? `Share ${waitingName}'s ID` : "Open Team & devices"}
            </Link>
          </>
        ) : next === 2 ? (
          <Link className="btn btn--primary" to="/app/team">
            <DashIcon name="team" />
            See who still needs to agree
          </Link>
        ) : (
          <Link className="btn btn--primary" to="/app/data">
            <DashIcon name="shield" />
            Set up protection
          </Link>
        )}
        {next > 0 ? (
          <Link className="dash-link" to="/app/team?add=1">
            Add another person
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default GetProtected;
