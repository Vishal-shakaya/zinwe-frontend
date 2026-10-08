/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the Zinwe API, without a trailing slash (e.g. https://api.zinwe.io).
   * Leave empty in development: /api is proxied to the Django dev server.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
