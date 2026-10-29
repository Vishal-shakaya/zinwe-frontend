import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { seoPages } from './build/seoPages.ts'

// The Django backend runs on 127.0.0.1:8000 during development. Requests to
// /api/* are proxied there, so the browser only ever talks to the Vite origin
// (no CORS needed locally). In production set VITE_API_BASE_URL instead.
// ZINWE_API_PROXY points the dev / preview proxy at another local backend (e.g. a worktree's on :8010).
const backend = { target: process.env.ZINWE_API_PROXY ?? 'http://127.0.0.1:8000', changeOrigin: true }

// /robots.txt and the sitemaps also come from Django (zinwe-backend z_main/seo.py), as nginx does on the servers.
const apiProxy = {
  '/api': backend,
  '/robots.txt': backend,
  '/sitemap.xml': backend,
  '/sitemap-pages.xml': backend,
}

// https://vite.dev/config/
export default defineConfig({
  // seoPages: a static, search-ready HTML file per public page + sitemap.xml (build/seoPages.ts).
  plugins: [react(), seoPages()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
  },
})
