import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { prefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { Icon } from "../ui/Icon";

interface FormSuccessProps {
  /** True once the form was sent; CSS (`.form.is-sent`) makes this visible. */
  active: boolean;
  heading: string;
  body: string;
  /** A next step under the text, e.g. a "Start free now" link. */
  action?: ReactNode;
}

/** Thank-you panel. Takes focus and scrolls into view when it appears. */
export function FormSuccess({ active, heading, body, action }: FormSuccessProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  }, [active]);

  return (
    <div className="form__ok" role="status" ref={ref} tabIndex={active ? -1 : undefined}>
      <div className="mark">
        <Icon name="check" />
      </div>
      <h2 className="h-small">{heading}</h2>
      <p>{body}</p>
      {action ? <div className="form__ok-action">{action}</div> : null}
    </div>
  );
}
