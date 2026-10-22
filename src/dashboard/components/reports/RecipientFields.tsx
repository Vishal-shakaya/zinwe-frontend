import type { ReactElement } from "react";
import { cx } from "../../../lib/cx";
import { DashIcon } from "../DashIcon";

export interface Recipients {
  toOwner: boolean;
  /** Each person gets only their own report. */
  toMembers: boolean;
  /** Other addresses, as typed (comma or space separated). */
  extra: string;
  csv: boolean;
}

function Check({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: string;
  hint?: string;
}): ReactElement {
  return (
    <label className={cx("dash-check rpt-check", checked && "is-on")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dash-check__box" aria-hidden="true">
        <DashIcon name="check" />
      </span>
      <span>
        {children}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

/**
 * Who gets a report (Email report, scheduled reports): the owner, each person their own report, other
 * addresses, and whether a CSV goes along with the PDF. `personName` = the report is about one person.
 */
export function RecipientFields({
  value,
  onChange,
  ownerEmail,
  personName,
  idPrefix,
}: {
  value: Recipients;
  onChange: (next: Recipients) => void;
  ownerEmail: string;
  personName: string | null;
  idPrefix: string;
}): ReactElement {
  const set = (patch: Partial<Recipients>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="rpt-recipients">
      <legend>Send it to</legend>
      <Check checked={value.toOwner} onChange={(toOwner) => set({ toOwner })} hint={ownerEmail}>
        Me
      </Check>
      <Check
        checked={value.toMembers}
        onChange={(toMembers) => set({ toMembers })}
        hint={
          personName
            ? "Their own report, at their work email"
            : "Each person gets a report with only their own days, at their work email. People with nothing recorded are skipped."
        }
      >
        {personName ?? "Each person, their own report"}
      </Check>
      <div className="field">
        <label htmlFor={`${idPrefix}-extra`}>
          Also send to <small>(up to 5 emails, e.g. a manager or your accountant)</small>
        </label>
        <input
          id={`${idPrefix}-extra`}
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="manager@yourcompany.com, accounts@yourcompany.com"
          value={value.extra}
          onChange={(e) => set({ extra: e.target.value })}
        />
      </div>
      <Check checked={value.csv} onChange={(csv) => set({ csv })} hint="The PDF is always attached">
        Attach a CSV for Excel too
      </Check>
    </fieldset>
  );
}
