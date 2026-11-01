import { useEffect, useRef, type ReactElement, type ReactNode } from "react";

/** The last step of choosing and paying: a tick, what happened, and the way to the dashboard. */
export function PlanDone({ title, children, onDone }: { title: string; children: ReactNode; onDone: () => void }): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);
  return (
    <div className="zpf-done">
      <span className="zpf-done__tick" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4 10-10" />
        </svg>
      </span>
      <h1 className="zau-h1" ref={heading} tabIndex={-1}>
        {title}
      </h1>
      <p className="zau-lede">{children}</p>
      <button type="button" className="zau-btn pri" onClick={onDone}>
        Go to your dashboard
      </button>
    </div>
  );
}
