import { useCallback, useEffect, type ReactElement, type ReactNode } from "react";
import { errorMessage, getReleaseNotes, type ReleaseNote } from "../lib/api";
import { formatDate } from "../lib/format";
import { useResource } from "../dashboard/useResource";

const SEEN_KEY = "zinwe.whatsnew.seen";

/** The newest note this browser has opened "What's new" on. */
function lastSeenNote(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markSeen(id: number): void {
  try {
    if (id > lastSeenNote()) localStorage.setItem(SEEN_KEY, String(id));
  } catch {
    // private window: the dot just stays until next time
  }
}

/**
 * A note's plain-text body as React elements (never HTML): "## " heading, "- " bullet, blank line = new paragraph.
 * Links are not made clickable here; release notes describe features, they don't send people elsewhere.
 */
function renderBody(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`u${out.length}`}>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
    if (para.length) {
      out.push(<p key={`p${out.length}`}>{para.join(" ")}</p>);
      para = [];
    }
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      out.push(<h3 key={`h${out.length}`}>{line.slice(3)}</h3>);
    } else if (/^[-*•] /.test(line)) {
      if (para.length) flush();
      bullets.push(line.slice(2));
    } else {
      if (bullets.length) flush();
      para.push(line);
    }
  }
  flush();
  return out;
}

/** Every published release note, newest first (FR-21). Used by the website's /whats-new and the dashboard. */
export function ReleaseNotes({ headingLevel = 2 }: { headingLevel?: 2 | 3 }): ReactElement {
  const load = useCallback((signal: AbortSignal) => getReleaseNotes(signal), []);
  const notes = useResource(load);
  const newest = notes.data?.[0]?.id;
  useEffect(() => {
    if (newest) markSeen(newest);
  }, [newest]);

  if (notes.data === undefined) {
    return notes.error ? (
      <p className="rn-empty" role="alert">
        {errorMessage(notes.error)}{" "}
        <button type="button" className="dash-link" onClick={notes.reload}>
          Try again
        </button>
      </p>
    ) : (
      <p className="rn-empty">Loading…</p>
    );
  }
  if (notes.data.length === 0) {
    return <p className="rn-empty">The first release notes are on their way.</p>;
  }
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ol className="rn-list">
      {notes.data.map((n: ReleaseNote) => (
        <li key={n.id} className="rn-note">
          <header className="rn-note__head">
            <span className="rn-note__version">Zinwe {n.version}</span>
            <time dateTime={n.published_at}>{formatDate(n.published_at)}</time>
          </header>
          <Heading className="rn-note__title">{n.title}</Heading>
          {n.summary ? <p className="rn-note__summary">{n.summary}</p> : null}
          <div className="rn-note__body">{renderBody(n.body)}</div>
        </li>
      ))}
    </ol>
  );
}
