/**
 * Finds links, email addresses and phone numbers in plain chat text (FR-12), so they can be shown as clickable
 * and copyable. Text only: nothing here produces markup, and only http(s), mailto: and tel: links come out.
 */

export type LinkToken =
  | { kind: "text"; text: string }
  | { kind: "url" | "email" | "phone"; text: string; href: string };

const PATTERN = new RegExp(
  [
    String.raw`(?<url>\bhttps?:\/\/[^\s<>"'` + "`" + String.raw`]+|\bwww\.[^\s<>"'` + "`" + String.raw`]+)`,
    String.raw`(?<email>\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b)`,
    // 10 to 15 digits, optionally "+<country>", spaces or dashes between: +91 98100 00000, 98100-00000.
    String.raw`(?<phone>(?<![\w+/.-])\+?\d(?:[\s-]?\d){9,14}(?![\w/.-]?\d))`,
  ].join("|"),
  "g",
);

/** Punctuation that ends a sentence, not a link: "see https://zinwe.io." */
const TRAILING = /[.,;:!?)\]}'"]+$/;

export function linkTokens(text: string): LinkToken[] {
  const out: LinkToken[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const groups = match.groups ?? {};
    let value = match[0];
    let kind: "url" | "email" | "phone";
    if (groups.url) {
      kind = "url";
      value = value.replace(TRAILING, "");
    } else if (groups.email) {
      kind = "email";
    } else {
      kind = "phone";
    }
    const start = match.index ?? 0;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    const href =
      kind === "url"
        ? value.startsWith("www.") ? `https://${value}` : value
        : kind === "email"
          ? `mailto:${value}`
          : `tel:${value.replace(/[\s-]/g, "")}`;
    out.push({ kind, text: value, href });
    last = start + value.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
