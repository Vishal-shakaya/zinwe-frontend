import type { ReactElement } from "react";
import { CopyButton } from "../../dashboard/components/CopyButton";
import type { PaymentInstructions } from "../../lib/api";
import { formatInr } from "../../lib/format";

function Row({ label, value, copy }: { label: string; value: string; copy?: string }): ReactElement | null {
  if (!value) return null;
  return (
    <div className="pay-row">
      <dt>{label}</dt>
      <dd>
        <span className={copy ? "pay-row__value pay-row__value--mono" : "pay-row__value"}>{value}</span>
        {copy ? <CopyButton text={value} what={copy} /> : null}
      </dd>
    </div>
  );
}

/** How to pay: UPI and bank details with copy buttons (values come from GET subscription/). */
export function PaymentInstructionsCard({
  instructions,
  amount,
}: {
  instructions: PaymentInstructions;
  amount: string;
}): ReactElement {
  const i = instructions;
  return (
    <section className="dash-card" aria-labelledby="pay-how-title">
      <div>
        <h2 className="dash-card__title" id="pay-how-title">
          How to pay
        </h2>
        <p className="dash-card__sub">
          Send <b>{formatInr(amount)}</b> by UPI or bank transfer, then fill in the form below.
        </p>
      </div>

      <div className="pay-ways">
        <div className="pay-way">
          <h3 className="pay-way__title">UPI</h3>
          <dl className="pay-rows">
            <Row label="UPI ID" value={i.upi_id} copy="UPI ID" />
            <Row label="Payee" value={i.payee_name} />
          </dl>
        </div>
        <div className="pay-way">
          <h3 className="pay-way__title">Bank transfer</h3>
          <dl className="pay-rows">
            <Row label="Account name" value={i.payee_name} />
            <Row label="Bank" value={i.bank_name} />
            <Row label="Account number" value={i.account_number} copy="account number" />
            <Row label="IFSC" value={i.ifsc} copy="IFSC code" />
          </dl>
        </div>
      </div>
      {i.note ? <p className="dash-note">{i.note}</p> : null}
    </section>
  );
}
