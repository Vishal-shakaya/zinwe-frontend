import { useState, type FormEvent, type ReactElement } from "react";
import { DashIcon } from "../../dashboard/components/DashIcon";
import { downloadQuotePdf, emailQuote, errorMessage, getMyQuote } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { emailError } from "../../lib/validation";
import { FormAlert, FormStatus } from "./FormAlert";

type Busy = "email" | "other" | "pdf" | "link" | null;

/**
 * Share the quote: email the PDF (with UPI, bank and Skydo details) to yourself or to whoever pays,
 * download it, or copy the public link (/quote/<token>) to send on.
 */
export function QuoteShare({
  ownerEmail,
  variant = "card",
}: {
  ownerEmail: string;
  /** "slip": a compact row of three buttons at the foot of the payment slip. */
  variant?: "card" | "slip";
}): ReactElement {
  const slip = variant === "slip";
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const [email, setEmail] = useState("");
  const [emailInvalid, setEmailInvalid] = useState<string | undefined>();

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<string>) => {
    setBusy(kind);
    setError(null);
    setStatus(null);
    try {
      setStatus(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const onOther = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = emailError(email);
    setEmailInvalid(invalid);
    if (invalid) return;
    void run("other", async () => {
      const sent = await emailQuote(email.trim());
      setEmail("");
      setOther(false);
      return `Quote sent to ${sent.sent_to}.`;
    });
  };

  return (
    <section className={slip ? "quote-share quote-share--slip" : "quote-share"} aria-labelledby="quote-share-title">
      {slip ? (
        <p className="quote-share__label" id="quote-share-title">
          Need a quote for your accounts team?
        </p>
      ) : (
        <>
          <h2 className="quote-share__title" id="quote-share-title">
            Need it on paper first?
          </h2>
          <p className="quote-share__sub">
            Get a PDF quote with every payment detail, for your records or your accounts team.
          </p>
        </>
      )}
      <div className="quote-share__actions">
        <button
          type="button"
          className="btn btn--ghost dash-btn-sm"
          disabled={busy !== null}
          onClick={() =>
            void run("email", async () => {
              const sent = await emailQuote();
              return `Quote sent to ${sent.sent_to}. Check your inbox.`;
            })
          }
        >
          <DashIcon name="mail" />
          {busy === "email" ? "Sending…" : slip ? "Email me" : "Email me the quote"}
        </button>
        <button
          type="button"
          className="btn btn--ghost dash-btn-sm"
          disabled={busy !== null}
          onClick={() =>
            void run("pdf", async () => {
              await downloadQuotePdf();
              return "Quote downloaded.";
            })
          }
        >
          <DashIcon name="download" />
          {busy === "pdf" ? "Preparing…" : slip ? "PDF" : "Download PDF"}
        </button>
        <button
          type="button"
          className="btn btn--ghost dash-btn-sm"
          disabled={busy !== null}
          onClick={() =>
            void run("link", async () => {
              const quote = await getMyQuote();
              return (await copyText(quote.public_url))
                ? "Link copied. Anyone with it can see the quote and how to pay."
                : `Copy this link: ${quote.public_url}`;
            })
          }
        >
          <DashIcon name="share" />
          {busy === "link" ? "Copying…" : "Copy link"}
        </button>
      </div>

      {other ? (
        <form className="quote-share__other" onSubmit={onOther} noValidate>
          <div className={emailInvalid ? "field is-invalid" : "field"}>
            <label htmlFor="quote-email">Send the quote to</label>
            <div className="quote-share__row">
              <input
                id="quote-email"
                type="email"
                autoComplete="email"
                placeholder="accounts@yourcompany.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailInvalid) setEmailInvalid(undefined);
                }}
                aria-invalid={emailInvalid ? true : undefined}
                aria-describedby={emailInvalid ? "quote-email-error" : undefined}
                autoFocus
              />
              <button type="submit" className="btn btn--ink dash-btn-sm" disabled={busy !== null}>
                {busy === "other" ? "Sending…" : "Send"}
              </button>
            </div>
            {emailInvalid ? (
              <p className="field__err" id="quote-email-error" role="alert">
                {emailInvalid}
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <button type="button" className="dash-link quote-share__more" onClick={() => setOther(true)}>
          {slip ? "Email it to someone else" : `Send it to someone else instead of ${ownerEmail}`}
        </button>
      )}

      <FormStatus message={status} />
      <FormAlert message={error} />
    </section>
  );
}
