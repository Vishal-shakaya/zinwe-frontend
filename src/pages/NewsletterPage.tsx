import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { MemberGate } from "../components/series/MemberGate";
import { errorMessage } from "../lib/api";
import { blogAsset, confirmBlogSubscription, unsubscribeFromBlog } from "../lib/api/blog";
import { getSeriesList, storeReaderKey } from "../lib/api/series";
import { downloadGuide, guideFromSource } from "../lib/api/guides";
import { trackEvent } from "../lib/analytics";
import "../styles/series.css";
import "../styles/site-stories.css";

type View =
  | { kind: "join" }
  | { kind: "working" }
  | { kind: "confirmed"; email: string; next: string; guide?: boolean }
  | { kind: "ask-unsubscribe" }
  | { kind: "unsubscribed"; email: string }
  | { kind: "error"; message: string };

/**
 * /newsletter, in the members' series look (dark, Zinwe orange, the series art behind):
 *   ?confirm=<token>      the link in the sign-up email: confirms straight away (and opens the series in this browser);
 *   ?unsubscribe=<token>  the link in every newsletter: asks first, so a mail scanner opening the link can't unsubscribe anyone;
 *   no token              the membership sign-up (one email field; membership is free).
 */
export default function NewsletterPage(): ReactElement {
  const [params] = useSearchParams();
  const confirmToken = params.get("confirm") ?? "";
  const unsubscribeToken = params.get("unsubscribe") ?? "";
  const [view, setView] = useState<View>(() =>
    confirmToken ? { kind: "working" } : unsubscribeToken ? { kind: "ask-unsubscribe" } : { kind: "join" },
  );
  const started = useRef(false);
  const shows = useResource(getSeriesList).data?.results ?? [];
  const art = shows.find((s) => s.cover)?.cover ?? null;

  usePageMeta({ title: "Newsletter — Zinwe", description: "Manage your Zinwe blog subscription." });

  // noindex: usePageMeta marks /newsletter (personal links) as private (content/seo.ts NOINDEX_PREFIXES).

  useEffect(() => {
    if (!confirmToken || started.current) return;
    started.current = true;
    confirmBlogSubscription(confirmToken)
      .then((r) => {
        // Membership opens the members-only series in this browser; back to the series page they joined from.
        if (r.access_key) storeReaderKey(r.access_key);
        trackEvent("tlf_member_confirmed", {});
        const fromSeries = (r.source ?? "").split("?")[0];
        // Signed up on a guide's page: the guide downloads now (the promise in the confirmation email).
        const guide = guideFromSource(r.source);
        if (guide && r.access_key) {
          downloadGuide(guide, r.access_key);
          trackEvent("file_download", { file_name: guide, item_id: guide, link_text: "guide_confirm" });
          setView({ kind: "confirmed", email: r.email, next: `/blog/guides/${guide}`, guide: true });
          return;
        }
        setView({ kind: "confirmed", email: r.email, next: /^\/blog\/series(\/[-\w]+){0,2}$/.test(fromSeries) ? fromSeries : "" });
      })
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
    <div className="zst-tv zst-nl" data-clarity-mask="true">
      <div className="zst-nl__art" aria-hidden="true">
        {art ? <img src={blogAsset(art.url)} alt="" width={1200} height={630} decoding="async" /> : null}
      </div>
      <div className="zst-nl__shade" aria-hidden="true" />
      <div className="zst-wrap zst-nl__inner">
        <div className="zst-nl__card" aria-live="polite">
          {view.kind === "join" ? (
            <>
              <p className="zst-kicker">Zinwe originals · the newsletter</p>
              <h1 className="zst-nl__h">Stories in your inbox, one episode at a time</h1>
              <p className="zst-nl__p">
                Short episodes about company data, identities and children online, each with a 10-minute fix. Members also get the
                free guides. Membership is free.
              </p>
              <MemberGate title="Join free">
                <p className="sx-gate__lede">Your first episode arrives the moment you confirm; the rest come by email, in order.</p>
              </MemberGate>
              {shows.length ? (
                <ul className="zst-nl__shows">
                  {shows.map((s) => (
                    <li key={s.slug}>
                      <Link to={`/blog/series/${s.slug}`}>
                        <b>{s.title}</b>
                        <span>{s.tagline}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : view.kind === "working" ? (
            <p className="zst-nl__p">One moment…</p>
          ) : view.kind === "confirmed" && view.guide ? (
            <>
              <p className="zst-kicker">You're a member</p>
              <h1 className="zst-nl__h">Your guide is downloading</h1>
              <p className="zst-nl__p">
                Check your downloads folder. Every other Zinwe guide is free for you too, and our members-only stories will come to{" "}
                <b>{view.email}</b>. Every email has an unsubscribe link at the bottom.
              </p>
              <div className="zst-nl__acts">
                <Link className="zst-btn zst-btn--orange" to={view.next}>
                  Back to the guide
                </Link>
                <Link className="zst-btn zst-btn--glass" to="/blog/guides">
                  More free guides
                </Link>
              </div>
            </>
          ) : view.kind === "confirmed" ? (
            <>
              <p className="zst-kicker">You're a member</p>
              <h1 className="zst-nl__h">Welcome in. It's unlocked.</h1>
              <p className="zst-nl__p">
                Members-only episodes are now open in this browser, and new ones will come to <b>{view.email}</b>. Every email has an
                unsubscribe link at the bottom.
              </p>
              <div className="zst-nl__acts">
                <Link className="zst-btn zst-btn--orange" to={view.next || "/blog/series"}>
                  {view.next ? "Continue reading" : "Start the series"}
                </Link>
                <Link className="zst-btn zst-btn--glass" to="/blog">
                  Read the blog
                </Link>
              </div>
            </>
          ) : view.kind === "ask-unsubscribe" ? (
            <>
              <p className="zst-kicker">Newsletter</p>
              <h1 className="zst-nl__h">Stop the blog emails?</h1>
              <p className="zst-nl__p">You won't get any more articles by email. You can sign up again any time on the blog.</p>
              <div className="zst-nl__acts">
                <button type="button" className="zst-btn zst-btn--orange" onClick={() => void unsubscribe()}>
                  Unsubscribe
                </button>
                <Link className="zst-btn zst-btn--glass" to="/blog">
                  Keep them coming
                </Link>
              </div>
            </>
          ) : view.kind === "unsubscribed" ? (
            <>
              <p className="zst-kicker">Done</p>
              <h1 className="zst-nl__h">You're unsubscribed</h1>
              <p className="zst-nl__p">
                <b>{view.email}</b> won't get blog emails any more. Sorry to see you go.
              </p>
              <div className="zst-nl__acts">
                <Link className="zst-btn zst-btn--glass" to="/blog">
                  Back to the blog
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="zst-kicker">Newsletter</p>
              <h1 className="zst-nl__h">This link didn't work</h1>
              <p className="zst-nl__p">{view.message || "It's incomplete. Open it again from the email, or sign up on the blog."}</p>
              <div className="zst-nl__acts">
                <Link className="zst-btn zst-btn--glass" to="/blog">
                  Go to the blog
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
