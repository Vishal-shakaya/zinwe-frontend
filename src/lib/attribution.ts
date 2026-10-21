/**
 * Newsletter attribution: remembers (30 days, this browser) that a visitor came through THE LAST FILE — which
 * episode, and whether from an episode email, a member's share link (?ref=) or the site — so a later Zinwe
 * sign-up can say where it started ("tlf:ep07:email") and a newsletter sign-up can credit the member who shared.
 * Nothing personal is stored: an episode number, a channel and a share code.
 */

const KEY = "zinwe.tlf.touch";
const DAYS = 30;

interface Touch {
  ep: string; // "ep07" | "series"
  via: "email" | "ref" | "site";
  ref: string;
  at: number;
}

function read(): Touch | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Touch;
    return Date.now() - t.at > DAYS * 86_400_000 ? null : t;
  } catch {
    return null;
  }
}

/**
 * Note a visit to the series (call on series and episode pages). `episode`: the episode number, or null on the
 * series page. A share code or an email visit is kept over a plain site visit.
 */
export function noteSeriesVisit(episode: number | null, search: string): void {
  const params = new URLSearchParams(search);
  const ref = (params.get("ref") ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);
  const via: Touch["via"] = ref ? "ref" : params.get("utm_medium") === "email" ? "email" : "site";
  const previous = read();
  if (previous && previous.via !== "site" && via === "site") {
    // keep the stronger channel, refresh the episode they're on
    write({ ...previous, ep: episode ? `ep${String(episode).padStart(2, "0")}` : previous.ep, at: Date.now() });
    return;
  }
  write({ ep: episode ? `ep${String(episode).padStart(2, "0")}` : "series", via, ref: ref || previous?.ref || "", at: Date.now() });
}

function write(t: Touch): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* storage blocked: no attribution, nothing breaks */
  }
}

/** For the Zinwe sign-up: "tlf:ep07:email", or "" when the visitor didn't come through the series. */
export function signupSource(): string {
  const t = read();
  return t ? `tlf:${t.ep}:${t.via}` : "";
}

/** The member share code that brought this visitor, for the newsletter sign-up. */
export function referralCode(): string {
  return read()?.ref ?? "";
}

/** Did this page view come from an episode email? (the episode API counts those reads) */
export function fromEmail(search: string): boolean {
  return new URLSearchParams(search).get("utm_medium") === "email";
}
