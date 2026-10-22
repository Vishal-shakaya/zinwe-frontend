import type { ReactElement } from "react";
import { DashIcon } from "./DashIcon";

/** One line of what is / isn't collected. */
export interface DiscloseRow {
  label: string;
  detail: string;
}

interface MetricsDisclosureProps {
  /** Card heading. */
  title?: string;
  /** One-line subheading under the title. */
  sub?: string;
  /** What's collected and shared with the admin. */
  collected?: DiscloseRow[];
  /** What's never collected. */
  never?: string[];
}

const INTERNET_COLLECTED: DiscloseRow[] = [
  { label: "Websites visited", detail: "The domain only (e.g. youtube.com) and time spent — never the full address, page or search terms." },
  { label: "Apps used", detail: "Which app is in the foreground (e.g. chrome, winword) and for how long." },
  { label: "Internet data used", detail: "How much data each app and website sends and receives — sizes only, never what was in it." },
  { label: "Blocked-site attempts", detail: "When someone opens a site your rules block — the domain and when." },
];

const INTERNET_NEVER: string[] = [
  "Keystrokes or anything typed",
  "Screenshots or screen recording",
  "Full web addresses, page contents or search terms",
  "Files, messages or their contents",
];

/**
 * Plain-language disclosure of exactly which metrics the agent collects and
 * shares with the admin, and what it never records. Defaults to the internet
 * copy; pass props to reuse it on other feature pages (e.g. data protection).
 */
export function MetricsDisclosure({
  title = "What Zinwe shares with you",
  sub = "Everything on this page comes from the metrics below. They're visible only to your company's admin, and each PC rolls them up by the hour — never a keystroke-by-keystroke log.",
  collected = INTERNET_COLLECTED,
  never = INTERNET_NEVER,
}: MetricsDisclosureProps = {}): ReactElement {
  return (
    <section className="dash-card" aria-labelledby="net-disclosure-title">
      <div className="dash-card__head">
        <h2 className="dash-card__title" id="net-disclosure-title">
          {title}
        </h2>
        <p className="dash-card__sub">{sub}</p>
      </div>

      <div className="dash-disclose">
        <div className="dash-disclose__col">
          <h3 className="dash-disclose__h dash-disclose__h--ok">
            <DashIcon name="check" /> Collected &amp; shared with the admin
          </h3>
          <ul className="dash-disclose__list">
            {collected.map((row) => (
              <li key={row.label}>
                <b>{row.label}</b>
                <span>{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="dash-disclose__col">
          <h3 className="dash-disclose__h dash-disclose__h--no">Never collected</h3>
          <ul className="dash-disclose__list dash-disclose__list--no">
            {never.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
