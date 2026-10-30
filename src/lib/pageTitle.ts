/**
 * Browser-tab / search titles for API-driven pages (articles, episodes, series, guides), by the same rule as the
 * backend's pre-render (zinwe-backend z_blog/seo_meta.py page_title): "<part> | <part> | Zinwe", dropping the brand
 * (then the extra parts) rather than cutting words past 60 characters. Prefer the API's own `page_title` when it sends one.
 */
const BRAND = "Zinwe";
const SEPARATOR = " | ";
const TITLE_MAX = 60;
/** A brand suffix already typed into a title ("Stop USB leaks | Zinwe", "... — Zinwe"). */
const BRAND_SUFFIX = /\s*[|—–:-]\s*Zinwe\s*$/i;

export function pageTitle(...parts: Array<string | null | undefined>): string {
  const clean = parts.map((p) => (p ?? "").replace(BRAND_SUFFIX, "").trim()).filter(Boolean);
  if (!clean.length) clean.push(BRAND);
  for (const candidate of [[...clean, BRAND], clean, [clean[0], BRAND]]) {
    const text = [...new Set(candidate)].join(SEPARATOR); // never "Zinwe | Zinwe"
    if (text.length <= TITLE_MAX) return text;
  }
  return clean[0];
}

/** At most `limit` characters, cut at a word boundary with an ellipsis (schema.org headline: 110). */
export function clipText(text: string, limit: number): string {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, "")}…`;
}
