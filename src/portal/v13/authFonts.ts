import { useEffect } from "react";

/**
 * Geist (800) and Geist Mono for the v1.3 sign-up / onboarding screens. index.html loads Geist only; the
 * dashboard adds the same stylesheet with this id, so it is never loaded twice.
 */
export function useAuthFonts(): void {
  useEffect(() => {
    const id = "zd-geist-mono";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}
