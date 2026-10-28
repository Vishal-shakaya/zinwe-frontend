import { useCallback, useEffect, type ReactElement, type ReactNode } from "react";
import { errorMessage, type ReleaseNote } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { loadReleaseNotes } from "../fixtures/releaseNotes";
import { EmptyBlock, ErrorBlock, Sk } from "../ui/States";
import { useResource } from "../useResource";

const SEEN_KEY = "zinwe.whatsnew.seen";

/** Remember the newest published note this browser has opened (same key as the website's What's new). */
function markSeen(id: number): void {
  try {
    if (id > (Number(localStorage.getItem(SEEN_KEY)) || 0)) localStorage.setItem(SEEN_KEY, String(id));
  } catch {
    /* private window */
  }
}

/** A note's plain-text body as React elements (never HTML): "## " heading, "- " bullets, other lines as notes. */
function body(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let bullets: string[] = [];
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
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[-*•] /.test(line)) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();
    if (line.startsWith("## ")) out.push(<b key={`h${out.length}`}>{line.slice(3)}</b>);
    else out.push(<span key={`p${out.length}`} className="zp-k">{line}</span>);
  }
  flush();
  return out;
}

function Note({ note, current }: { note: ReleaseNote; current: boolean }): ReactElement {
  const id = `wn-${note.id}`;
  const when = note.published_at ? formatDate(note.published_at) : "";
  return (
    <section className={`z-card zp-card zp-wn${current ? " now" : ""}`} aria-labelledby={id}>
      <span className="zp-wn__meta">
        <span className={`z-mono zp-ver${current ? " now" : ""}`}>Zinwe {note.version}</span>
        {current ? <span className="z-pill green">Current</span> : null}
        <span className="zp-k">{current ? note.summary || when : [when, note.summary].filter(Boolean).join(" · ")}</span>
      </span>
      <b id={id} className="zp-wn__title">
        {note.title}
      </b>
      {body(note.body)}
    </section>
  );
}

/** Board DashHelp → What's new: the release notes, newest first (GET whats-new/, FR-21). */
export function WhatsNewList(): ReactElement {
  const load = useCallback((signal: AbortSignal) => loadReleaseNotes(signal), []);
  const notes = useResource(load);
  const newest = notes.data?.[0]?.id;
  useEffect(() => {
    if (newest && newest > 0) markSeen(newest);
  }, [newest]);

  if (notes.data === undefined) {
    return notes.error ? (
      <section className="z-card zp-card">
        <ErrorBlock title="We couldn't load what's new" message={errorMessage(notes.error)} onRetry={notes.reload} />
      </section>
    ) : (
      <section className="z-card zp-card" aria-busy="true">
        <span className="z-sr" role="status">
          Loading what's new…
        </span>
        <Sk w={120} h={20} />
        <Sk w="60%" h={16} />
        <Sk h={12} />
        <Sk h={12} />
        <Sk w="80%" h={12} />
      </section>
    );
  }
  if (notes.data.length === 0) {
    return (
      <section className="z-card zp-card">
        <EmptyBlock icon="news" title="Nothing new yet">
          The first release notes are on their way.
        </EmptyBlock>
      </section>
    );
  }
  return (
    <>
      {notes.data.map((n, i) => (
        <Note key={n.id} note={n} current={i === 0} />
      ))}
    </>
  );
}
