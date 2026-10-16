import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { useResource } from "../dashboard/useResource";
import { NewsletterSignup } from "../components/blog/NewsletterSignup";
import { ApiError, errorMessage } from "../lib/api";
import { blogAsset, getArticle, withAssetBase, type Article } from "../lib/api/blog";
import { formatDate } from "../lib/format";
import { cx } from "../lib/cx";
import "../styles/blog.css";

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

/** Public /blog/:slug: one published article, styled for reading, with related articles. */
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
      <div className="wrap blog-empty blog-empty--page">
        <b>{missing ? "This article isn't here" : "The article didn't load"}</b>
        <span>{missing ? "It may have moved or been unpublished." : errorMessage(res.error)}</span>
        <Link className="btn btn--ghost" to="/blog">
          All articles
        </Link>
      </div>
    );
  }
  if (!article) return <div className="wrap article-skeleton" aria-busy="true" />;

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

  return (
    <article className="article">
      <header className="wrap article__head">
        <nav className="article__crumbs" aria-label="Breadcrumb">
          <Link to="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/blog?type=${article.type}`}>{article.type_label}</Link>
        </nav>
        <span className={cx("kind-tag", `kind--${article.type}`)}>{article.type_label}</span>
        <h1 className="h-display article__title">{article.title}</h1>
        {article.summary ? <p className="article__summary">{article.summary}</p> : null}
        <p className="blog-meta">
          {article.author_name ? <span>{article.author_name}</span> : null}
          {article.author_name ? <span aria-hidden="true">·</span> : null}
          <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          <span aria-hidden="true">·</span>
          {article.reading_minutes} min read
        </p>
      </header>

      {article.cover ? (
        <div className="wrap article__cover-wrap">
          <img className="article__cover" src={blogAsset(article.cover.url)} alt={article.cover_alt} fetchPriority="high" />
        </div>
      ) : null}

      <div className="wrap article__layout">
        <div className="article__body" dangerouslySetInnerHTML={{ __html: withAssetBase(article.body_html) }} />

        <aside className="article__aside">
          <div className="article__share">
            <b>Share</b>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share)}`}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(share)}&text=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${share}`)}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <button type="button" onClick={() => void copy()}>
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
          {article.tags.length ? (
            <div className="article__tags">
              {article.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          ) : null}
          <NewsletterSignup compact />
        </aside>
      </div>

      <section className="wrap article__cta">
        <div>
          <b>Protect your team's PCs in minutes</b>
          <span>Free forever for up to 3 PCs. No card needed.</span>
        </div>
        <Link className="btn btn--primary" to="/signup?plan=free">
          Start free
        </Link>
      </section>

      {article.related.length ? (
        <section className="wrap article__related" aria-labelledby="related-title">
          <h2 id="related-title">Keep reading</h2>
          <div className="blog-grid">
            {article.related.map((a) => (
              <Link key={a.slug} to={`/blog/${a.slug}`} className="blog-card">
                {a.cover ? (
                  <img className="blog-cover" src={blogAsset(a.cover.url)} alt={a.cover_alt} loading="lazy" />
                ) : (
                  <div className={cx("blog-cover blog-cover--empty", `kind--${a.type}`)} aria-hidden="true">
                    <span>{a.type_label}</span>
                  </div>
                )}
                <div className="blog-card__body">
                  <span className={cx("kind-tag", `kind--${a.type}`)}>{a.type_label}</span>
                  <h3>{a.title}</h3>
                  <p className="blog-meta">
                    {formatDate(a.published_at)} · {a.reading_minutes} min read
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
