/**
 * The server pre-renders some pages for search engines (zinwe-backend z_blog/prerender.py): it sets
 * head tags (remembering the originals in `data-prerender-content`) and adds others
 * (`data-prerender`). Undo that before the app starts, so each page's own hooks own the head
 * again and nothing leaks into the next page. #root is replaced by React's first render anyway.
 */
export function clearPrerender(): void {
  document.querySelectorAll("[data-prerender]").forEach((el) => el.remove());
  document.querySelectorAll<HTMLMetaElement>("meta[data-prerender-content]").forEach((el) => {
    el.content = el.dataset.prerenderContent ?? el.content;
    el.removeAttribute("data-prerender-content");
  });
}
