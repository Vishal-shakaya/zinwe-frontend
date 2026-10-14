import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { LEGAL_UPDATED, type LegalDoc } from "../../content/legal";
import { LegalText } from "./LegalText";
import "./legal.css";

/**
 * Read-before-you-agree dialog: one or more policies (tabs), the full text, and
 * "I agree" — which ticks the checkbox that opened it. Built on <dialog>, so
 * focus is trapped and Esc closes it.
 */
export function LegalDialog({
  open,
  docs,
  title,
  onClose,
  onAgree,
  agreeLabel = "I agree",
}: {
  open: boolean;
  docs: readonly LegalDoc[];
  title: string;
  onClose: () => void;
  onAgree?: () => void;
  agreeLabel?: string;
}): ReactElement | null {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    body.current?.scrollTo(0, 0);
  }, [active]);

  if (!open) return null;
  const doc = docs[Math.min(active, docs.length - 1)];

  return (
    <dialog
      ref={ref}
      className="legal-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="legal-dialog__panel">
        <header className="legal-dialog__head">
          <div>
            <h2 id={titleId}>{title}</h2>
            <small>Last updated {LEGAL_UPDATED}</small>
          </div>
          <button type="button" className="legal-dialog__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {docs.length > 1 ? (
          <nav className="legal-dialog__tabs" aria-label="Policies">
            {docs.map((d, i) => (
              <button
                key={d.slug + d.title}
                type="button"
                className={i === active ? "is-on" : undefined}
                aria-current={i === active ? "true" : undefined}
                onClick={() => setActive(i)}
              >
                {d.title}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="legal-dialog__body" ref={body} tabIndex={0}>
          <LegalText doc={doc} headingLevel={3} />
        </div>
        <footer className="legal-dialog__foot">
          <a href={`/legal/${doc.slug}`} target="_blank" rel="noreferrer" className="legal-dialog__open">
            Open in a new tab
          </a>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
          {onAgree ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onAgree();
                onClose();
              }}
            >
              {agreeLabel}
            </button>
          ) : null}
        </footer>
      </div>
    </dialog>
  );
}

export default LegalDialog;
