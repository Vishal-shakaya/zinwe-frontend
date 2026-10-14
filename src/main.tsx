import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { reloadOnceForFreshCode } from "./lib/lazyPage";
import { clearPrerender } from "./lib/prerender";
import "./styles/site.css";
import "./styles/app.css";
import "./styles/zin.css";

// Production builds: Vite fires this when a chunk/CSS preload fails (usually an old tab after a
// deploy). Reload once for fresh code; if that already happened, let the error boundary handle it.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForFreshCode()) event.preventDefault();
});

clearPrerender(); // undo server pre-rendered head tags (/blog pages) before the app takes over

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
