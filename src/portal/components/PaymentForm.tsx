import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { ChipGroup } from "../../components/forms/ChipGroup";
import { Field } from "../../components/forms/Field";
import { paymentMethodOptions, REFERENCE_LABEL } from "../../content/portal";
import { submitPayment, type Payment, type PaymentField, type PaymentMethod } from "../../lib/api";
import { todayIso } from "../../lib/format";
import { compactErrors, focusFirstInvalid, requiredError, type FieldErrorMap } from "../../lib/validation";
import { apiFieldErrors, apiFormError } from "../failure";
import { FormAlert } from "./FormAlert";

const FIELDS: readonly PaymentField[] = ["method", "amount_inr", "reference", "paid_on", "payer_name", "proof"];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const PROOF_EXT = /\.(jpe?g|png|pdf)$/i;

function proofError(file: File | null): string | undefined {
  if (!file) return undefined;
  if (!PROOF_TYPES.includes(file.type) && !PROOF_EXT.test(file.name)) return "Upload a JPG, PNG or PDF file.";
  if (file.size > MAX_PROOF_BYTES) return "That file is over 5 MB. Upload a smaller screenshot or PDF.";
  return undefined;
}

function amountError(value: string): string | undefined {
  if (value.trim() === "") return "Enter the amount you paid.";
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? undefined : "Enter the amount in rupees, like 1999.";
}

function paidOnError(value: string): string | undefined {
  if (value === "") return "Enter the date you paid.";
  return value > todayIso() ? "The payment date can't be in the future." : undefined;
}

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface PaymentFormProps {
  /** Prefilled from the subscription, e.g. "1999.00". */
  amount: string;
  payerName: string;
  onSubmitted: (payment: Payment) => void | Promise<void>;
  /** Dashboard upgrade: the plan code this payment is for. */
  upgradePlan?: string;
}

/** "I've paid" form: method, amount, reference/UTR, date, payer, optional proof. */
export function PaymentForm({ amount, payerName, onSubmitted, upgradePlan }: PaymentFormProps): ReactElement {
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [amountInr, setAmountInr] = useState(() => String(Number(amount) || ""));
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso);
  const [payer, setPayer] = useState(payerName);
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
      amount_inr: amountError(amountInr),
      reference: requiredError(reference),
      paid_on: paidOnError(paidOn),
      payer_name: requiredError(payer),
      proof: proofError(proof),
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
        <p className="dash-card__sub">We match it with our bank statement, then switch your plan on.</p>
      </div>

      <div className="form__grid">
        <Field full error={errors.method}>
          <span className="co-label" id="pay-method-label">
            How did you pay?
          </span>
          <ChipGroup
            type="radio"
            name="method"
            options={paymentMethodOptions}
            selected={[method]}
            onToggle={(value) => setMethod(value)}
            labelledBy="pay-method-label"
            firstInputRef={reg("method")}
          />
        </Field>

        <Field error={errors.amount_inr}>
          <label htmlFor="pay-amount">Amount paid (₹)</label>
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

      <FormAlert message={formError} />

      <div className="co-form__foot">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Sending…" : "Submit payment details"}
        </button>
      </div>
    </form>
  );
}
