import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { SiteSubscribe } from "../components/site/SiteSubscribe";
import { ReadingProgress } from "../components/stories/ReadingProgress";
import { trackEvent } from "../lib/analytics";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset, getArticle, withAssetBase, type Article, type ArticleType } from "../lib/api/blog";
import { formatDate } from "../lib/format";
import { clipText, pageTitle } from "../lib/pageTitle";
import { OG_IMAGE } from "../content/seo";
import { SiteMark } from "../components/site/SiteMark";
import "../styles/site-blog.css";
import "../styles/site-stories.css";

const SITE = "https://zinwe.io";
/** The blog's topic names (the same as its filters). */
const TOPIC: Partial<Record<ArticleType, string>> = { informative: "Data safety", tutorial: "How-to guides" };

/** Set (and on leave, remove) the article-only head tags search engines and link previews read. */
function useArticleHead(article: Article | undefined): void {
  useEffect(() => {
    if (!article) return;
    const url = `${SITE}/blog/${article.slug}`;
    const cover = article.cover ? new URL(blogAsset(article.cover.url), window.location.origin).href : undefined;
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
    if (cover) {
      meta("property", "og:image", cover);
      meta("property", "og:image:alt", article.cover_alt || article.title);
    }

    // The canonical link is set by usePageMeta (from the route): one per page.

    // schema.org Article: lets search engines show date, author and image.
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": article.type === "press_release" ? "NewsArticle" : "BlogPosting",
      headline: clipText(article.seo_title || article.title, 110), // schema.org: at most 110 characters
      description: article.meta_description,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: article.author_name || "Zinwe" },
      publisher: { "@type": "Organization", name: "Zinwe", logo: { "@type": "ImageObject", url: `${SITE}/brand/zinwe-logo-96.png` } },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: cover ?? OG_IMAGE, // the article's cover, else the site's share image
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
 * Public /blog/:slug (v1.3.2, "story"): one calm reading column (~66 characters, a book serif for the body), the
 * headline, dek and byline, the cover, a reading-progress hint at the top of the window, pull quotes when the article
 * has them (<blockquote>), then Share, the "send it as a task" line, "Up next" (one story, big), Keep reading and
 * Go deeper (the closest free guide or series episode), and the newsletter. Head tags and structured data as before.
 */
export default function ArticlePage(): ReactElement {
  const { slug = "" } = useParams();
  const load = useCallback((signal: AbortSignal) => getArticle(slug, signal), [slug]);
  const res = useResource(load, { resetKey: slug });
  const article = res.data;
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  usePageMeta({
    // The API's page_title (backend rule: "<title> | Zinwe", brand dropped past 60 characters), else the same rule here.
    title: article ? article.page_title || pageTitle(article.seo_title || article.title) : pageTitle("Blog"),
    description: article?.meta_description || "Guides, releases and news from Zinwe.",
  });
  useArticleHead(article);

  if (res.error && !article) {
    const missing = res.error instanceof ApiError && res.error.kind === "not_found";
    return (
      <div className="zst-wrap zst-art__head">
        <div className="zst-state zst-state--light">
          <b>{missing ? "This article isn't here" : "The article didn't load"}</b>
          <span>{missing ? "It may have moved or been unpublished." : errorMessage(res.error)}</span>
          <span className="zst-state__acts">
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
      // The same outer box as the loaded article, so the page doesn't shift when it arrives (CLS).
      <div className="zst-art-page" aria-busy="true">
        <div className="zst-wrap zst-art__head">
          <div className="zst-skel zst-skel--art" />
        </div>
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
  const [next, ...others] = article.related;

  return (
    <div className="zst-art-page">
      <ReadingProgress target={bodyRef} />
      <article className="zst-art">
        <header className="zst-wrap zst-art__head">
          <nav aria-label="Breadcrumb" className="zst-art__crumbs">
            <Link to="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/blog?type=${article.type}`}>{TOPIC[article.type] ?? article.type_label}</Link>
          </nav>
          <h1 className="zst-art__h1">{article.title}</h1>
          {article.summary ? <p className="zst-art__dek">{article.summary}</p> : null}
          <div className="zst-art__by">
            <SiteMark size={28} tile className="zst-art__z" />
            <span>
              <b>{article.author_name || "Zinwe team"}</b>
              <span>
                <time dateTime={article.published_at}>{formatDate(article.published_at)}</time> · {article.reading_minutes} min read
              </span>
            </span>
          </div>
        </header>
        {/* Covers are 1200×630: the attributes reserve the space before the image arrives (CLS). */}
        {article.cover ? (
          <div className="zst-wrap zst-art__cover">
            <img src={blogAsset(article.cover.url)} alt={article.cover_alt} width={1200} height={630} fetchPriority="high" />
          </div>
        ) : null}
        <div className="zst-wrap">
          <div ref={bodyRef} className="zst-prose" dangerouslySetInnerHTML={{ __html: withAssetBase(article.body_html) }} />
          <div className="zst-art__end">
            <div className="zst-art__share">
              <span>Share</span>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${share}`)}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <button type="button" onClick={() => void copy()}>
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
            <div className="zst-art__cta">
              <span>
                <b>Send this week's change as a task.</b> Chat, tasks and data safety, free for up to 3 PCs.
              </span>
              <Link className="zs-btn zs-btn--pri zs-btn--flat" to="/signup?plan=free">
                Start free
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Up next: one story, big, so the next read is an easy yes; then the rest, quietly. */}
      {next ? (
        <section className="zst-wrap zst-next" aria-labelledby="zst-next-h">
          <h2 id="zst-next-h" className="zst-next__k">
            Up next
          </h2>
          <Link to={`/blog/${next.slug}`} className="zst-next__link">
            <span className="zst-next__art">
              {next.cover ? <img src={blogAsset(next.cover.url)} alt="" width={1200} height={630} loading="lazy" decoding="async" /> : null}
            </span>
            <span className="zst-next__body">
              <span className="zst-kick">
                {TOPIC[next.type] ?? next.type_label} · {next.reading_minutes} min read
              </span>
              <span className="zst-next__t">{next.title}</span>
              {next.summary ? <span className="zst-next__dek">{next.summary}</span> : null}
              <span className="zst-next__go">Read it →</span>
            </span>
          </Link>
        </section>
      ) : null}

      {others.length || guide || pick ? (
        <section className="zst-wrap zst-more" aria-label="Keep reading">
          {others.length ? (
            <div className="zst-more__list">
              <h2 className="zst-more__t">Keep reading</h2>
              <ul>
                {others.map((a) => (
                  <li key={a.slug}>
                    <Link to={`/blog/${a.slug}`}>
                      <span className="zst-kick">
                        {TOPIC[a.type] ?? a.type_label} · {a.reading_minutes} min read
                      </span>
                      <b>{a.title}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {guide || pick ? (
            <div className="zst-more__picks">
              <h2 className="zst-more__t">Go deeper</h2>
              {guide ? (
                <Link
                  className="zst-pick"
                  to={`/blog/guides/${guide.slug}`}
                  onClick={() => trackEvent("select_promotion", { promotion_name: "guide_pick", item_id: guide.slug })}
                >
                  <span className="zst-kick">Free guide · {guide.page_count} pages</span>
                  <b>{guide.title}</b>
                </Link>
              ) : null}
              {pick ? (
                <Link
                  className="zst-pick zst-pick--dark"
                  to={`/blog/series/${pick.series_slug}/${pick.slug}`}
                  onClick={() => trackEvent("select_promotion", { promotion_name: "tlf_article_pick", item_id: pick.slug })}
                >
                  <span className="zst-kick">
                    {pick.label}
                  </span>
                  <b>{pick.title}</b>
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <SiteSubscribe variant="band" />
    </div>
  );
}
