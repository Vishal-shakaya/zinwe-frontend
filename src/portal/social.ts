/**
 * Social sign-in (FR-38): the browser half.
 *
 * Google: Google Identity Services' pop-up code flow (our own button, their pop-up). The pop-up hands back a
 * one-time `code`; the backend swaps it with the client secret and signs the person in.
 * LinkedIn: a full-page trip to LinkedIn ("Sign In with LinkedIn using OpenID Connect") that comes back to
 * /auth/linkedin/callback with `code` + `state`; the state we made here must match, so nobody can replay a code.
 */
import type { SocialConfig } from "../lib/api";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const LI_STATE_KEY = "zinwe.linkedin.state";
export const LINKEDIN_CALLBACK_PATH = "/auth/linkedin/callback";

interface CodeResponse {
  code?: string;
  error?: string;
}
interface CodeClient {
  requestCode: () => void;
}
interface GoogleOAuth2 {
  initCodeClient: (config: {
    client_id: string;
    scope: string;
    ux_mode: "popup";
    callback: (response: CodeResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }) => CodeClient;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

let gisPromise: Promise<GoogleOAuth2> | null = null;

/** Load Google's script once (only when someone may press the button). */
export function loadGoogle(): Promise<GoogleOAuth2> {
  gisPromise ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    const ready = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) resolve(oauth2);
      else reject(new Error("gis-missing"));
    };
    if (window.google?.accounts?.oauth2) return ready();
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      gisPromise = null;
      reject(new Error("gis-load"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

export type GoogleOutcome = { ok: true; code: string } | { ok: false; reason: "closed" | "failed" };

/** Open Google's pop-up and wait for the code. "closed" = the person closed it (not an error to show loudly). */
export async function requestGoogleCode(clientId: string): Promise<GoogleOutcome> {
  let oauth2: GoogleOAuth2;
  try {
    oauth2 = await loadGoogle();
  } catch {
    return { ok: false, reason: "failed" };
  }
  return new Promise<GoogleOutcome>((resolve) => {
    const client = oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: (response) =>
        resolve(response.code ? { ok: true, code: response.code } : { ok: false, reason: "failed" }),
      error_callback: (error) => resolve({ ok: false, reason: error?.type === "popup_closed" ? "closed" : "failed" }),
    });
    client.requestCode();
  });
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function linkedinRedirectUri(): string {
  return `${window.location.origin}${LINKEDIN_CALLBACK_PATH}`;
}

/** Send the browser to LinkedIn. `from` is where to come back to if the person cancels ("/login" or "/signup"). */
export function startLinkedIn(config: SocialConfig["linkedin"], from: string): void {
  const state = randomState();
  try {
    window.sessionStorage.setItem(LI_STATE_KEY, JSON.stringify({ state, from }));
  } catch {
    /* private mode: the callback will say the link expired */
  }
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.client_id);
  url.searchParams.set("redirect_uri", linkedinRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scope || "openid profile email");
  window.location.assign(url.toString());
}

/** Read and forget the state saved before the trip. Null when there is none (new tab, expired, replay). */
export function takeLinkedInState(): { state: string; from: string } | null {
  try {
    const raw = window.sessionStorage.getItem(LI_STATE_KEY);
    window.sessionStorage.removeItem(LI_STATE_KEY);
    return raw ? (JSON.parse(raw) as { state: string; from: string }) : null;
  } catch {
    return null;
  }
}
