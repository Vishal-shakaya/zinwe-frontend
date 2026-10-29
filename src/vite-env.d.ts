/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the Zinwe API, without a trailing slash (e.g. https://api.zinwe.io).
   * Leave empty in development: /api is proxied to the Django dev server.
   */
  readonly VITE_API_BASE_URL?: string;
  /** "1": load Google Analytics on any host (testing the tag); normally only zinwe.io does (lib/analytics.ts). */
  readonly VITE_GA_DEBUG?: string;
  /** "1": show the owner dashboard's sample-only features in a build (dashboard/fixtures, SAMPLES_ON). Always on in dev. */
  readonly VITE_SAMPLE_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
