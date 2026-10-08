# Zinwe — marketing site (React)

React port of the static site in `../../website/`. It looks and behaves the same:
the copy, DOM classes and stylesheet are unchanged, and the static site's
`site.js` behaviour was rewritten as React components and hooks.

Stack: Vite 8 · React 19 · TypeScript · react-router-dom 7 (`BrowserRouter`) · oxlint.

## Scripts

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm install`     | Install dependencies                                      |
| `npm run dev`     | Dev server on http://localhost:5173 (strict port, `/api` proxied) |
| `npm run build`   | Type-check (`tsc -b`), then production build into `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:4173 (same `/api` proxy) |
| `npm run lint`    | oxlint (incl. `rules-of-hooks` and `exhaustive-deps`)      |

## Environment

Copy `.env.example` to `.env` if you need to override anything.

| Variable            | Default | Meaning |
| ------------------- | ------- | ------- |
| `VITE_API_BASE_URL` | empty   | Origin of the Django API, no trailing slash. Leave it empty for local development so requests use the proxy. In production set it to e.g. `https://api.zinwe.io`, and allow this site's origin in the backend's CORS settings. |

## How the API proxy works

`src/lib/api.ts` builds URLs as `${VITE_API_BASE_URL}/api/...`. When the variable
is empty, the browser calls `/api/...` on the Vite server, and `vite.config.ts`
forwards `/api` to `http://127.0.0.1:8000` (the Django dev server) with
`changeOrigin`. Because the browser only talks to one origin, local development
needs no CORS setup. If Django isn't running, the proxy returns 5xx, and the form
shows "Couldn't reach the server…" without losing what the visitor typed.

### Early-access contract

`POST /api/auth/early-access/` with
`{ name, email, company, phone, team_size, platforms[], concerns[] }`
(`phone` is `""` when empty). The client calls it as `submitEarlyAccess(payload)` and gets back a discriminated union:

- `201` → success panel ("Spot reserved.")
- `200` + `already_registered: true` → "You're already on the list."
- `400` → DRF field errors are shown under their fields, using the same inline UI as client validation. `non_field_errors`, `detail` and unknown keys are shown above the submit button.
- `429` → "Too many attempts. Try again in a few minutes."
- network error, 15 s timeout, or `5xx` → "Couldn't reach the server. Check your connection and try again."

The contact form has no backend yet. It validates, saves to `localStorage["zinwe.contact"]`
and shows the thank-you, the same as the static site. See the `TODO` in
`src/components/forms/ContactForm.tsx`.

## Routes

| Path            | Page                               |
| --------------- | ---------------------------------- |
| `/`             | Home (`/#how` scrolls to the setup wizard) |
| `/early-access` | Early-access form                  |
| `/contact`      | Contact form                       |
| `*`             | 404                                |

Every navigation starts at the top of the page. A URL hash scrolls to the matching
`id`: smoothly on the same page, and with a jump when arriving from another page.
Each page sets its `<title>`, meta description and OG tags with `usePageMeta`.

Production hosting needs an SPA fallback, so unknown paths must serve `index.html`.

## Folder map

```
src/
  main.tsx                 entry: StrictMode, global CSS
  App.tsx                  BrowserRouter
  routes.tsx               route table (Layout + pages)
  vite-env.d.ts            typing for VITE_API_BASE_URL
  styles/
    site.css               the static site's stylesheet, unchanged
    app.css                React-only additions (form-level error, disabled button, 404)
  components/
    layout/                Layout, Nav (burger, scrolled state), Footer, StickyCta, heroCtaContext
    ui/                    Brand, Icon (inline SVGs), Reveal (.rv), Chip, StaggerTitle
    home/                  Hero, Translator, WatchPanel, SetupWizard, ConsentFacts, Platforms, OfferBand
    forms/                 Field, ChipGroup, FormSuccess, EarlyAccessForm, ContactForm
  pages/                   HomePage, EarlyAccessPage, ContactPage, NotFoundPage
  hooks/                   useInView, useReveal, usePrefersReducedMotion, usePageMeta, useScrollOnNavigate
  lib/                     api.ts (typed client), validation.ts, cx.ts
  content/                 translatorEvents, wizard, watchItems, forms (copy and data, kept out of the JSX)
public/favicon.svg
```

## Behaviour notes

- **Translator:** one effect drives one cycle (type, settle, hold). Every timer goes through a single handle that the cleanup cancels. This means pausing off-screen (IntersectionObserver, 20% visible), clicking a dot, or StrictMode's double mount never leaves two loops running.
- **Setup wizard:** auto-plays once when it is 40% visible. Replay restarts it, and manual picks update the rule.
- **Reduced motion:** reveals show immediately, the log line appears without typing, and holds are longer. This matches `site.js` and the CSS `prefers-reduced-motion` block.
