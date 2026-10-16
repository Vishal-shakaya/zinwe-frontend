import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { ChipGroup } from "../../components/forms/ChipGroup";
import { Field } from "../../components/forms/Field";
import { paymentMethodOptions, REFERENCE_LABEL } from "../../content/portal";
import { submitPayment, type Currency, type Payment, type PaymentField, type PaymentMethod } from "../../lib/api";
import { todayIso } from "../../lib/format";
import { compactErrors, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../failure";
import { FormAlert } from "./FormAlert";
import { TermsCheckbox } from "../../components/legal/TermsCheckbox";
import { PAYMENT_TERMS } from "../../content/legal";

const FIELDS: readonly PaymentField[] = [
  "method",
  "amount_inr",
  "reference",
  "paid_on",
  "payer_name",
  "proof",
  "accept_terms",
];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const PROOF_EXT = /\.(jpe?g|png|pdf)$/i;

function proofError(file: File | null): string | undefined {
  if (!file) return undefined;
  if (!PROOF_TYPES.includes(file.type) && !PROOF_EXT.test(file.name)) return "Upload a JPG, PNG or PDF file.";
  if (file.size > MAX_PROOF_BYTES) return "That file is over 5 MB. Upload a smaller screenshot or PDF.";
  return undefined;
}

function amountError(value: string, currency: Currency): string | undefined {
  if (value.trim() === "") return "Enter the amount you paid.";
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return undefined;
  return currency === "USD" ? "Enter the amount in US dollars, like 144." : "Enter the amount in rupees, like 1145.78.";
}

/** India: UPI / bank (cheque and cash for the odd case). Outside India: Skydo, or PayPal as a fallback. */
const METHODS_BY_REGION: Record<"IN" | "INTL", readonly PaymentMethod[]> = {
  IN: ["upi", "bank_transfer", "cheque", "cash"],
  INTL: ["skydo", "paypal"],
};

function paidOnError(value: string): string | undefined {
  if (value === "") return "Enter the date you paid.";
  return value > todayIso() ? "The payment date can't be in the future." : undefined;
}

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface PaymentFormProps {
  /** The total due, prefilled, e.g. "1145.78". */
  amount: string;
  /** The amount's currency (default INR). */
  currency?: Currency;
  /** Which payment methods to offer (default India). */
  region?: "IN" | "INTL";
  /** Outside India: also offer PayPal (only while it's shown on the payment page). */
  allowPaypal?: boolean;
  payerName: string;
  onSubmitted: (payment: Payment) => void | Promise<void>;
  /** Dashboard upgrade: the plan code this payment is for. */
  upgradePlan?: string;
}

/** "I've paid" form: method, amount, reference/UTR, date, payer, optional proof. */
export function PaymentForm({
  amount,
  currency = "INR",
  region = "IN",
  allowPaypal = false,
  payerName,
  onSubmitted,
  upgradePlan,
}: PaymentFormProps): ReactElement {
  const methods = METHODS_BY_REGION[region].filter((m) => m !== "paypal" || allowPaypal);
  // In the order above (Skydo first abroad, UPI first in India).
  const methodChoices = methods.flatMap((m) => paymentMethodOptions.filter((o) => o.value === m));
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [amountInr, setAmountInr] = useState(() => String(Number(amount) || ""));
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso);
  const [payer, setPayer] = useState(payerName);
  const [accepted, setAccepted] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrorMap<PaymentField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const controls = useRef<Partial<Record<PaymentField, HTMLElement | null>>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const reg = (field: PaymentField) => (el: HTMLElement | null) => {
    controls.current[field] = el;
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const invalid = proofError(file);
    setErrors((e) => ({ ...e, proof: invalid }));
    if (invalid) {
      event.target.value = "";
      setProof(null);
    } else {
      setProof(file);
    }
  };

  const removeFile = () => {
    setProof(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const clientErrors = compactErrors<PaymentField>({
      amount_inr: amountError(amountInr, currency),
      reference: requiredError(reference),
      paid_on: paidOnError(paidOn),
      payer_name: requiredError(payer),
      proof: proofError(proof),
      accept_terms: accepted ? undefined : "Please accept the payment terms to continue.",
    });
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return focusFirstInvalid(FIELDS, clientErrors, controls.current);

    setPending(true);
    try {
      const payment = await submitPayment({
        method,
        amount_inr: Number(amountInr).toFixed(2),
        reference: reference.trim(),
        paid_on: paidOn,
        payer_name: payer.trim(),
        proof,
        upgrade_plan: upgradePlan,
        accept_terms: accepted,
      });
      await onSubmitted(payment);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error, FIELDS);
      setErrors(fieldErrors);
      setFormError(apiFormError(error, FIELDS));
      focusFirstInvalid(FIELDS, fieldErrors, controls.current);
      setPending(false);
    }
  };

  return (
    <form className="dash-card" onSubmit={onSubmit} noValidate aria-labelledby="pay-form-title">
      <div>
        <h2 className="dash-card__title" id="pay-form-title">
          Tell us about your payment
        </h2>
        <p className="dash-card__sub">
          We match it with {region === "INTL" ? "Skydo" : "our bank statement"}, then switch your plan on and email
          you the invoice.
        </p>
      </div>

      <div className="form__grid">
        <Field full error={errors.method}>
          <span className="co-label" id="pay-method-label">
            How did you pay?
          </span>
          <ChipGroup
            type="radio"
            name="method"
            options={methodChoices}
            selected={[method]}
            onToggle={(value) => setMethod(value)}
            labelledBy="pay-method-label"
            firstInputRef={reg("method")}
          />
        </Field>

        <Field error={errors.amount_inr}>
          <label htmlFor="pay-amount">Amount paid ({currency === "USD" ? "US$" : "₹"})</label>
          <input
            ref={reg("amount_inr")}
            id="pay-amount"
            inputMode="decimal"
            value={amountInr}
            onChange={(e) => setAmountInr(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={errors.amount_inr ? true : undefined}
          />
        </Field>

        <Field error={errors.reference}>
          <label htmlFor="pay-ref">{REFERENCE_LABEL[method]}</label>
          <input
            ref={reg("reference")}
            id="pay-ref"
            spellCheck={false}
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            aria-invalid={errors.reference ? true : undefined}
          />
        </Field>

        <Field error={errors.paid_on}>
          <label htmlFor="pay-date">Paid on</label>
          <input
            ref={reg("paid_on")}
            id="pay-date"
            type="date"
            max={todayIso()}
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            aria-invalid={errors.paid_on ? true : undefined}
          />
        </Field>

        <Field error={errors.payer_name}>
          <label htmlFor="pay-payer">Paid by (name on the account)</label>
          <input
            ref={reg("payer_name")}
            id="pay-payer"
            autoComplete="name"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            aria-invalid={errors.payer_name ? true : undefined}
          />
        </Field>

        <Field full error={errors.proof}>
          <label htmlFor="pay-proof">
            Payment screenshot or receipt <small>(optional, JPG, PNG or PDF up to 5 MB)</small>
          </label>
          {proof ? (
            <div className="pay-file">
              <span className="pay-file__name">{proof.name}</span>
              <small>{fileSize(proof.size)}</small>
              <button type="button" className="dash-link" onClick={removeFile}>
                Remove
              </button>
            </div>
          ) : null}
          <input
            ref={(el) => {
              fileRef.current = el;
              controls.current.proof = el;
            }}
            id="pay-proof"
            className={proof ? "dash-sr" : "pay-file__input"}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={onFile}
            aria-invalid={errors.proof ? true : undefined}
          />
        </Field>
      </div>

      <TermsCheckbox
        id="pay-terms"
        checked={accepted}
        onChange={(value) => {
          setAccepted(value);
          if (value && errors.accept_terms) setErrors((e) => ({ ...e, accept_terms: undefined }));
        }}
        docs={[PAYMENT_TERMS]}
        dialogTitle="Payment terms"
        lead="I've paid and agree to Zinwe's"
        error={errors.accept_terms}
        inputRef={reg("accept_terms") as (el: HTMLInputElement | null) => void}
        disabled={pending}
      />

      <FormAlert message={formError} />

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Sending…" : "Submit payment details"}
        </button>
      </div>
    </form>
  );
}
