import type { ReactElement, ReactNode } from "react";
import { Bell } from "./Bell";

/**
 * The header row every board starts with: small label (date / section) + h1 (+ optional lede) on the left,
 * the page's actions, then the bell as the LAST item (no row of its own).
 * On a phone the bell moves to the top bar; actions marked `zn-desk-only` hide (they live in the "+" sheet).
 */
export function PageHead({
  label,
  title,
  lede,
  actions,
  id,
}: {
  label?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  id?: string;
}): ReactElement {
  return (
    <header className="zn-head">
      <div className="zn-head__text">
        {label ? <span className="z-lbl">{label}</span> : null}
        <h1 id={id} style={label ? undefined : { marginTop: 0 }}>
          {title}
        </h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {actions ? <div className="zn-head__acts">{actions}</div> : null}
      <Bell placement="page" />
    </header>
  );
}
