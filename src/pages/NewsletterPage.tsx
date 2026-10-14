import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { errorMessage } from "../lib/api";
import { confirmBlogSubscription, unsubscribeFromBlog } from "../lib/api/blog";
import "../styles/blog.css";

type View =
  | { kind: "working" }
  | { kind: "confirmed"; email: string }
  | { kind: "ask-unsubscribe" }
  | { kind: "unsubscribed"; email: string }
  | { kind: "error"; message: string };

/**
 * /newsletter?confirm=<token> (the link in the sign-up email: confirms straight away) and
 * /newsletter?unsubscribe=<token> (the link in every newsletter: asks first, so a mail scanner
 * opening the link can't unsubscribe anyone).
 */
export default function NewsletterPage(): ReactElement {
  const [params] = useSearchParams();
  const confirmToken = params.get("confirm") ?? "";
  const unsubscribeToken = params.get("unsubscribe") ?? "";
  const [view, setView] = useState<View>(() =>
    confirmToken ? { kind: "working" } : unsubscribeToken ? { kind: "ask-unsubscribe" } : { kind: "error", message: "" },
  );
  const started = useRef(false);

  usePageMeta({ title: "Newsletter — Zinwe", description: "Manage your Zinwe blog subscription." });

  useEffect(() => {
    // Inject <meta name="robots" content="noindex">: these pages are personal links.
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (!confirmToken || started.current) return;
    started.current = true;
    confirmBlogSubscription(confirmToken)
      .then((r) => setView({ kind: "confirmed", email: r.email }))
      .catch((err) => setView({ kind: "error", message: errorMessage(err) }));
  }, [confirmToken]);

  const unsubscribe = async () => {
    setView({ kind: "working" });
    try {
      const r = await unsubscribeFromBlog(unsubscribeToken);
      setView({ kind: "unsubscribed", email: r.email });
    } catch (err) {
      setView({ kind: "error", message: errorMessage(err) });
    }
  };

  return (
    <div className="wrap nl-page">
      <div className="nl-page__card" aria-live="polite">
        {view.kind === "working" ? (
          <p className="muted">One moment…</p>
        ) : view.kind === "confirmed" ? (
          <>
            <p className="eyebrow">You're subscribed</p>
            <h1>Thanks for confirming</h1>
            <p>
              New articles will come to <b>{view.email}</b>. Every email has an unsubscribe link at the bottom.
            </p>
            <Link className="btn btn--primary" to="/blog">
              Read the blog
            </Link>
          </>
        ) : view.kind === "ask-unsubscribe" ? (
          <>
            <p className="eyebrow">Newsletter</p>
            <h1>Stop the blog emails?</h1>
            <p>You won't get any more articles by email. You can sign up again any time on the blog.</p>
            <div className="nl-page__actions">
              <button type="button" className="btn btn--primary" onClick={() => void unsubscribe()}>
                Unsubscribe
              </button>
              <Link className="btn btn--ghost" to="/blog">
                Keep them coming
              </Link>
            </div>
          </>
        ) : view.kind === "unsubscribed" ? (
          <>
            <p className="eyebrow">Done</p>
            <h1>You're unsubscribed</h1>
            <p>
              <b>{view.email}</b> won't get blog emails any more. Sorry to see you go.
            </p>
            <Link className="btn btn--ghost" to="/blog">
              Back to the blog
            </Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Newsletter</p>
            <h1>This link didn't work</h1>
            <p>{view.message || "It's incomplete. Open it again from the email, or sign up on the blog."}</p>
            <Link className="btn btn--ghost" to="/blog">
              Go to the blog
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
