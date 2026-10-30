import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { CHAT_SPOT, FACES } from "../../../content/site/home";
import { PathIcon, Tick } from "../SiteIcon";
import { Face } from "./Face";

/** The people list on the left of the chat window (the demo company; their last line, as on the Product page). */
const PEOPLE = [
  { face: FACES.priya, name: "Priya Nair", last: "On it, calling them now.", on: true },
  { face: FACES.arjun, name: "Arjun Mehta", last: "Deployed at 11:05.", on: false },
  { face: FACES.emily, name: "Emily Carter", last: "Back by 2!", on: false },
  { face: FACES.sneha, name: "Sneha Reddy", last: "Got it, thank you!", on: false },
] as const;

/**
 * "Message anyone, right at their PC." (v1.3.2): one narrow measure, the words on one side and the chat itself on
 * the other: faces and message bubbles rather than three boxes. The window is a drawing (role img), not a form.
 */
export function ChatSpotlight(): ReactElement {
  return (
    <section className="zh2-sec zh2-chat" aria-labelledby="zh2-chat-h">
      <div className="zs-wrap zh2-chat__in">
        <div className="zh2-chat__copy">
          <span className="zh2-kick">{CHAT_SPOT.kick}</span>
          <h2 id="zh2-chat-h" className="zh2-h">
            {CHAT_SPOT.title}
          </h2>
          <p className="zh2-lead">{CHAT_SPOT.lead}</p>
          <ul className="zh2-ticks">
            {CHAT_SPOT.points.map((t) => (
              <li key={t}>
                <Tick size={15} stroke={2.6} className="zh2-tick" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Link className="zh2-more" to="/product#chat">
            {CHAT_SPOT.link} <span aria-hidden="true">›</span>
          </Link>
        </div>

        <div className="zh2-win" role="img" aria-label="A chat in the Zinwe dashboard with Priya, on sample data: her message, your reply, and the reply turned into a task she has started.">
          <div className="zh2-win__people" aria-hidden="true">
            {PEOPLE.map((p) => (
              <span key={p.name} className={p.on ? "zh2-person is-on" : "zh2-person"}>
                <span className="zh2-person__face">
                  <Face k={p.face} size={36} />
                </span>
                <span className="zh2-person__t">
                  <b>{p.name}</b>
                  <span>{p.last}</span>
                </span>
              </span>
            ))}
          </div>
          <div className="zh2-win__talk" aria-hidden="true">
            <div className="zh2-win__head">
              <Face k={FACES.priya} size={34} />
              <span>
                <b>Priya Nair</b>
                <span className="zh2-online">At her PC</span>
              </span>
            </div>
            <div className="zh2-win__body">
              <span className="zh2-line">
                <Face k={FACES.priya} size={28} />
                <span className="zh2-bub">Sharma Traders sent only 3 of 5 invoices.</span>
              </span>
              <span className="zh2-line zh2-line--me">
                <span className="zh2-bub zh2-bub--me">Thanks Priya. Making it a task.</span>
              </span>
              <span className="zh2-line zh2-line--me">
                <span className="zh2-task">
                  <span className="zh2-task__k">Task</span>
                  <b>Chase Sharma Traders for 2 missing invoices</b>
                  <span className="zh2-stages zh2-stages--sm">
                    <span className="is-done" />
                    <span className="is-done" />
                    <span className="is-now" />
                    <span />
                  </span>
                  <span className="zh2-task__s">In progress</span>
                </span>
              </span>
              <span className="zh2-seen zh2-seen--me">2:14 PM · Seen</span>
              <span className="zh2-line">
                <Face k={FACES.priya} size={28} />
                <span className="zh2-bub">On it, calling them now.</span>
              </span>
            </div>
            <div className="zh2-win__compose">
              <span>Message Priya…</span>
              <span className="zh2-win__send">
                <PathIcon d="M12 19V5M5 12l7-7 7 7" size={16} stroke={2.4} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
