/** Site-name checks shared by every site box on Rules. */

const DOMAIN_RE = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normSite(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

/** Domain check shared by every site input. Returns "" when fine. */
export function siteError(v: string, empty: string): string {
  if (!v) return empty;
  if (!DOMAIN_RE.test(v)) return "That doesn’t look like a site name. Try something like example.com.";
  return "";
}
