import { useId, type ReactElement } from "react";
import { ZIcon } from "../ui/ZIcon";
import "../../styles/dash13/protection.css";

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
 * Plain-language disclosure of exactly which metrics the agent collects and shares with the admin, and what it
 * never records (v1.3: a quiet card that opens on click, so it never pushes the page's numbers down). Defaults to
 * the internet copy; pass props to reuse it on other pages (e.g. Data safety).
 */
export function MetricsDisclosure({
  title = "What Zinwe shares with you",
  sub = "Everything on this page comes from the metrics below. They're visible only to your company's admin, and each PC rolls them up by the hour — never a keystroke-by-keystroke log.",
  collected = INTERNET_COLLECTED,
  never = INTERNET_NEVER,
}: MetricsDisclosureProps = {}): ReactElement {
  const id = useId();
  return (
    <details className="z-card zdisc">
      <summary className="zdisc__sum">
        <span className="zdisc__mark" aria-hidden="true">
          <ZIcon d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4" size={16} stroke={2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b id={`${id}-t`} className="zdisc__title">
            {title}
          </b>
          <span className="zdisc__sub">{sub}</span>
        </span>
        <span className="zdisc__chev" aria-hidden="true">
          <ZIcon name="chevronDown" size={16} stroke={2} />
        </span>
      </summary>
      <div className="zdisc__cols">
        <div>
          <h3 className="zdisc__h ok">
            <ZIcon name="check" size={14} stroke={2.4} /> Collected &amp; shared with the admin
          </h3>
          <ul className="zdisc__list">
            {collected.map((row) => (
              <li key={row.label}>
                <b>{row.label}</b>
                <span>{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="zdisc__h no">
            <ZIcon name="close" size={14} stroke={2.4} /> Never collected
          </h3>
          <ul className="zdisc__list no">
            {never.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
