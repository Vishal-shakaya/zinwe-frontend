import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { SiteSubscribe } from "../components/site/SiteSubscribe";
import { trackEvent } from "../lib/analytics";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset, getArticle, withAssetBase, type Article } from "../lib/api/blog";
import { formatDate } from "../lib/format";
import "../styles/site-blog.css";

const SITE = "https://zinwe.io";

/** Set (and on leave, remove) the article-only head tags search engines and link previews read. */
function useArticleHead(article: Article | undefined): void {
  useEffect(() => {
    if (!article) return;
    const url = `${SITE}/blog/${article.slug}`;
    const image = article.cover ? new URL(blogAsset(article.cover.url), window.location.origin).href : undefined;
    const added: Element[] = [];
    const saved: [HTMLMetaElement, string][] = [];

    const meta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (el) saved.push([el, el.content]);
      else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        added.push(el);
      }
      el.content = content;
    };
    meta("property", "og:type", "article");
    meta("property", "og:url", url);
    meta("property", "article:published_time", article.published_at);
    meta("property", "article:section", article.type_label);
    if (image) {
      meta("property", "og:image", image);
      meta("property", "og:image:alt", article.cover_alt || article.title);
    }

    // The canonical link is set by usePageMeta (from the route): one per page.

    // schema.org Article: lets search engines show date, author and image.
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": article.type === "press_release" ? "NewsArticle" : "BlogPosting",
      headline: article.seo_title || article.title,
      description: article.meta_description,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: article.author_name || "Zinwe" },
      publisher: { "@type": "Organization", name: "Zinwe", logo: { "@type": "ImageObject", url: `${SITE}/brand/zinwe-logo-96.png` } },
      mainEntityOfPage: url,
      ...(image ? { image } : {}),
      keywords: article.tags.join(", "),
    });
    document.head.appendChild(ld);
    added.push(ld);

    return () => {
      added.forEach((el) => el.remove());
      saved.forEach(([el, content]) => {
        el.content = content;
      });
    };
  }, [article]);
}

/**
 * Public /blog/:slug, v3 (board SiteArticle): the article on a white sheet (breadcrumb, title, summary, byline, cover,
 * body from the API), a dark "start free" call to action, and a side column with Share, the closest free guide
 * (or series episode) and the newsletter; then "Keep reading". Loading, not-found and error states as before.
 */
export default function ArticlePage(): ReactElement {
  const { slug = "" } = useParams();
  const load = useCallback((signal: AbortSignal) => getArticle(slug, signal), [slug]);
  const res = useResource(load, { resetKey: slug });
  const article = res.data;
  const [copied, setCopied] = useState(false);

  usePageMeta({
    title: article ? `${article.seo_title} — Zinwe` : "Blog — Zinwe",
    description: article?.meta_description || "Guides, releases and news from Zinwe.",
  });
  useArticleHead(article);

  if (res.error && !article) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="zs-wrap za-wrap">
        <div className="zs-state">
          <b>{missing ? "This article isn't here" : "The article didn't load"}</b>
          <span>{missing ? "It may have moved or been unpublished." : errorMessage(res.error)}</span>
          <span className="za-state__acts">
            {missing ? null : (
              <button type="button" className="zs-btn zs-btn--sm" onClick={res.reload}>
                Try again
              </button>
            )}
            <Link className="zs-btn zs-btn--sm" to="/blog">
              All articles
            </Link>
          </span>
        </div>
      </div>
    );
  }
  if (!article) {
    return (
      <div className="zs-wrap za-wrap" aria-busy="true">
        <div className="zs-skel za-skel" />
      </div>
    );
  }

  const share = `${SITE}/blog/${article.slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the link is still in the address bar */
    }
  };
  const guide = article.guide_pick;
  const pick = article.series_pick;

  return (
    <>
      <article className="zs-wrap za-wrap">
        <div className="za-paper">
          <nav aria-label="Breadcrumb" className="za-crumbs">
            <Link className="zs-link" to="/blog">
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <Link to={`/blog?type=${article.type}`}>{article.type_label}</Link>
          </nav>
          <h1 className="za-h1">{article.title}</h1>
          {article.summary ? <p className="za-sum">{article.summary}</p> : null}
          <div className="za-by">
            <span className="za-by__z" aria-hidden="true">
              Z
            </span>
            {article.author_name || "Zinwe team"} · <time dateTime={article.published_at}>{formatDate(article.published_at)}</time> · {article.reading_minutes} min read
          </div>
          {article.cover ? <img className="za-cover" src={blogAsset(article.cover.url)} alt={article.cover_alt} fetchPriority="high" /> : null}
          <div className="zs-prose za-prose" dangerouslySetInnerHTML={{ __html: withAssetBase(article.body_html) }} />
          <div className="za-cta">
            <span>
              <b>Run your office with Zinwe.</b> Chat, work hours and data safety, free for up to 3 PCs.
            </span>
            <Link className="zs-btn zs-btn--pri zs-btn--flat" to="/signup?plan=free">
              Start free
            </Link>
          </div>
        </div>

        <aside className="za-aside">
          <div className="zb-side">
            <span className="za-k">SHARE</span>
            <div className="za-share">
              <a className="za-sh" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a className="za-sh" href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${share}`)}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <button type="button" className="za-sh" onClick={() => void copy()}>
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
          </div>
          {guide ? (
            <Link
              className="za-pick"
              to={`/blog/guides/${guide.slug}`}
              onClick={() => trackEvent("select_promotion", { promotion_name: "guide_pick", item_id: guide.slug })}
            >
              {guide.cover ? (
                <img className="za-pick__img" src={blogAsset(guide.cover.url)} alt="" loading="lazy" />
              ) : (
                <span className="za-pick__book" aria-hidden="true">
                  <span />
                </span>
              )}
              <span className="za-pick__t">
                <span className="zs-mono za-pick__k">FREE GUIDE · {guide.page_count} PAGES</span>
                <b>{guide.title}</b>
              </span>
            </Link>
          ) : null}
          {pick ? (
            <Link
              className="za-pick"
              to={`/blog/series/${pick.series_slug}/${pick.slug}`}
              onClick={() => trackEvent("select_promotion", { promotion_name: "tlf_article_pick", item_id: pick.slug })}
            >
              <span className="za-pick__book za-pick__book--series" aria-hidden="true">
                <span />
              </span>
              <span className="za-pick__t">
                <span className="zs-mono za-pick__k">{pick.series_title.toUpperCase()} · {pick.label.toUpperCase()}</span>
                <b>{pick.title}</b>
              </span>
            </Link>
          ) : null}
          <SiteSubscribe variant="side" />
        </aside>
      </article>

      {article.related.length ? (
        <section className="zs-wrap za-more" aria-labelledby="za-more-h">
          <h2 id="za-more-h">Keep reading</h2>
          <div className="za-more__grid">
            {article.related.map((a) => (
              <Link key={a.slug} to={`/blog/${a.slug}`} className="za-more__a">
                <span>
                  {a.type_label} · {a.reading_minutes} min
                </span>
                <b>{a.title}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="za-more za-more--empty" />
      )}
    </>
  );
}
