import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ReleaseNotes } from "../components/ReleaseNotes";
import { DeviceLoops } from "../components/resources/DeviceLoops";
import { LATEST_RELEASE, type ReleaseIcon } from "../content/site/releases";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import "../styles/whatsnew.css";
import "../styles/resources.css";

/** Small line icons for the release items (24 px grid, currentColor). */
const ICONS: Record<ReleaseIcon, ReactElement> = {
  tasks: <path d="M5 4h14v16H5zM9 9l2 2 4-4M9 15h6" />,
  chat: <path d="M5 5h14v10H10l-5 4zM9 9h6M9 12h4" />,
  pictures: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10h.01M15 10h.01M9 14.5c1.6 1.4 4.4 1.4 6 0" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4" />,
  windows: <path d="M4 6l7-1v6.5H4zM13 4.7L20 4v7.5h-7zM4 12.5h7V19l-7-1zM13 12.5h7V20l-7-1z" />,
  logo: <path d="M6 6h12L6 18h12" />,
};

/** /whats-new: the New release page. The latest release in motion on a laptop and a phone, then its notes (FR-21). */
export default function WhatsNewPage(): ReactElement {
  usePageMeta(seoFor("/whats-new"));
  const r = LATEST_RELEASE;
  return (
    <div className="zrs zrs-new">
      <header className="wrap zrs-new__hero">
        <nav className="zrs-crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Zinwe blog</Link>
          <span aria-hidden="true">/</span>
          <span>New release</span>
        </nav>
        <p className="zrs-new__badge">
          <span className="zrs-new__dot" aria-hidden="true" />
          New release · Zinwe {r.version}
        </p>
        <h1 className="zrs-new__title">What's new in Zinwe.</h1>
        <p className="zrs-new__lede">{r.summary}</p>
      </header>

      <div className="wrap zrs-new__stage">
        <DeviceLoops />
      </div>

      <section className="wrap zrs-log" aria-labelledby="zrs-latest">
        <div className="zrs-log__side">
          <span className="zrs-log__version">Zinwe {r.version}</span>
          <time dateTime={r.date}>{r.dateLabel}</time>
        </div>
        <div className="zrs-log__main">
          <h2 id="zrs-latest" className="zrs-log__title">
            {r.title}
          </h2>
          <ul className="zrs-log__items">
            {r.items.map((it) => (
              <li key={it.title} className={`zrs-item zrs-item--${it.icon}`}>
                <span className="zrs-item__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[it.icon]}
                  </svg>
                </span>
                <div>
                  <h3 className="zrs-item__title">
                    {it.title} <span className="zrs-item__tag">{it.tag}</span>
                  </h3>
                  <p className="zrs-item__text">{it.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="zrs-log__update">
            To update a PC, click Update now in the Zinwe window, or download the installer again from{" "}
            <Link to="/download">zinwe.io/download</Link>.
          </p>
        </div>
      </section>

      <section className="wrap zrs-log zrs-log--earlier" aria-labelledby="zrs-earlier">
        <div className="zrs-log__side">
          <h2 id="zrs-earlier" className="zrs-log__earlier">
            Earlier releases
          </h2>
        </div>
        <div className="zrs-log__main rn-wrap">
          <ReleaseNotes
            headingLevel={3}
            skip={(n) => n.version === r.version || n.version.startsWith(`${r.version}.`)}
            emptyText="Earlier release notes will show here."
          />
        </div>
      </section>
    </div>
  );
}
