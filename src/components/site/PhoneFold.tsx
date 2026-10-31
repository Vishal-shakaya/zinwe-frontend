import type { ReactElement, ReactNode } from "react";
import { useIsPhone } from "../../hooks/useIsPhone";

/**
 * Detail that stays closed on a phone: a tap-to-open row there; on wider screens `wide` then the children, as they
 * were. `open` starts it open on a phone. Styles: site-phone.css.
 */
export function PhoneFold({ label, wide, open = false, children }: { label: ReactNode; wide?: ReactNode; open?: boolean; children: ReactNode }): ReactElement {
  const phone = useIsPhone();
  if (!phone) {
    return (
      <>
        {wide}
        {children}
      </>
    );
  }
  return (
    <details className="zs-fold" open={open}>
      <summary>
        <span>{label}</span>
        <span className="zs-fold__sign" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="zs-fold__body">{children}</div>
    </details>
  );
}
