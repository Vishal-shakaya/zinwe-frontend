import type { ReactElement } from "react";

/**
 * "Continue with LinkedIn" / "Continue with Google" (AuthFlow board). The API has no social sign-in yet, so both
 * are drawn but disabled with a "Coming soon" note; wiring them needs new auth endpoints (OAuth start + callback).
 */
export function SocialSignIn(): ReactElement {
  return (
    <div className="zau-social">
      <button type="button" className="zau-btn li full" disabled aria-describedby="zau-social-soon">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#fff" />
          <circle cx="7.5" cy="7.2" r="1.5" fill="#0A66C2" />
          <path
            d="M7.5 10.5V17M11.5 17v-6.5M11.5 13.6c0-1.9 1.2-3.1 2.8-3.1s2.7 1.1 2.7 3.1V17"
            stroke="#0A66C2"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        Continue with LinkedIn
        <span className="zau-soon">Coming soon</span>
      </button>
      <button type="button" className="zau-btn full" disabled aria-describedby="zau-social-soon">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        Continue with Google
        <span className="zau-soon">Coming soon</span>
      </button>
      <span className="zau-social__note" id="zau-social-soon">
        LinkedIn and Google sign-in are coming soon. For now, use your work email below.
      </span>
    </div>
  );
}

/** The "or" divider between the social buttons and the email form. */
export function OrDivider(): ReactElement {
  return (
    <div className="zau-ordiv" aria-hidden="true">
      or
    </div>
  );
}
