import { useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { DashIcon } from "../dashboard/components/DashIcon";
import { usePageMeta } from "../hooks/usePageMeta";
import { ApiError, errorMessage, getPublicQuote, isAbortError, publicQuotePdfUrl, type SharedQuote } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { OrderSummary } from "../portal/components/OrderSummary";
import { PaymentWays } from "../portal/components/PaymentWays";
import { defaultWay, type PayWay } from "../portal/payWays";
import "../styles/dashboard.css";
import "../styles/portal.css";

type Load = { state: "loading" } | { state: "ready"; quote: SharedQuote } | { state: "gone" } | { state: "error"; message: string };

/**
 * /quote/<token>: a shared quote, for anyone with the link (the owner, or the accounts team they sent it to).
 * What's due, every way to pay and the PDF. Not indexed (robots + noindex).
 */
export default function QuotePage(): ReactElement {
  usePageMeta({ title: "Your Zinwe quote", description: "What to pay for your Zinwe plan, and how." });
  const { token = "" } = useParams();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [way, setWay] = useState<PayWay | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPublicQuote(token, controller.signal)
      .then((quote) => setLoad({ state: "ready", quote }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        if (err instanceof ApiError && err.kind === "not_found") setLoad({ state: "gone" });
        else setLoad({ state: "error", message: errorMessage(err) });
      });
    return () => {
      controller.abort();
    };
  }, [token, attempt]);

  if (load.state !== "ready") {
    return (
      <section className="qpage">
        <div className="qpage__wrap qpage__wrap--narrow">
          {load.state === "loading" ? (
            <div className="dash-boot" role="status" aria-live="polite">
              Loading the quote…
            </div>
          ) : load.state === "gone" ? (
            <div className="dash-card qpage__gone">
              <h1 className="onb__title">This quote link has expired</h1>
              <p className="onb__lede">
                The plan may already be paid, or a different plan was chosen. Ask whoever sent it for a new link, or
                sign in to see what's due.
              </p>
              <div className="onb__actions">
                <Link className="btn btn--primary" to="/login">
                  Log in to Zinwe
                </Link>
                <a className="dash-link" href="mailto:hello@zinwe.io">
                  Email hello@zinwe.io
                </a>
              </div>
            </div>
          ) : (
            <div className="dash-card qpage__gone" role="alert">
              <h1 className="onb__title">We couldn't load the quote</h1>
              <p className="onb__lede">{load.message}</p>
              <div className="onb__actions">
                <button type="button" className="btn btn--primary" onClick={() => {
                    setLoad({ state: "loading" });
                    setAttempt((n) => n + 1);
                  }}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  const q = load.quote;
  const total = formatMoney(q.quote.total, q.quote.currency);
  const current = way ?? defaultWay(q.instructions);

  return (
    <section className="qpage" aria-labelledby="qpage-title">
      <div className="qpage__wrap">
        <header className="qpage__head">
          <div>
            <p className="sub-kicker">Quotation · {q.number}</p>
            <h1 className="onb__title" id="qpage-title">
              Zinwe {q.plan.name} for {q.customer.name}
            </h1>
            <p className="onb__lede">
              {total} for {q.quote.months === 12 ? "1 year" : "1 month"}. Issued {formatDate(q.issued_on)}, valid until{" "}
              {formatDate(q.valid_until)}.
            </p>
          </div>
          <a className="btn btn--ghost dash-btn-sm" href={publicQuotePdfUrl(token)} download>
            <DashIcon name="download" />
            Download PDF
          </a>
        </header>

        <div className="paypage__grid">
          <div className="paypage__main">
            <section className="dash-card pay-panel" aria-labelledby="qpage-pay">
              <div className="pay-section">
                <div className="pay-section__head">
                  <span className="pay-section__num" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <h2 className="pay-section__title" id="qpage-pay">
                      Pay {total}
                    </h2>
                    <p className="pay-section__sub">Use any one of these. Every option pays {q.seller.name}, the company behind Zinwe.</p>
                  </div>
                </div>
                <PaymentWays instructions={q.instructions} total={total} way={current} onWay={setWay} idPrefix="qways" showNote={false} />
              </div>
              <hr className="pay-panel__rule" />
              <div className="pay-section">
                <div className="pay-section__head">
                  <span className="pay-section__num" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <h2 className="pay-section__title">Send us the receipt</h2>
                    <p className="pay-section__sub">
                      {q.customer.contact ? `${q.customer.contact} can upload it` : "Upload it"} on the Zinwe payment
                      page, or reply to the quote email with it attached. We switch the plan on within one working day
                      and email the invoice.
                    </p>
                  </div>
                </div>
                <div className="qpage__upload">
                  <Link className="btn btn--primary" to="/login">
                    Log in to upload the receipt
                  </Link>
                </div>
              </div>
            </section>
          </div>

          <aside className="paypage__side" aria-label="Quote details">
            <OrderSummary
              quote={q.quote}
              devices={q.plan.max_devices ? `Up to ${q.plan.max_devices} PCs` : undefined}
              payee={q.seller.name}
              reference={q.customer.name}
            />
            <div className="dash-card qpage__parties">
              <div>
                <p className="sub-kicker">Prepared for</p>
                <p className="qpage__party">{q.customer.name}</p>
                {q.customer.contact ? <p>{q.customer.contact}</p> : null}
                {q.customer.address ? <p>{q.customer.address}</p> : null}
                {q.customer.gstin ? <p>GSTIN {q.customer.gstin}</p> : null}
              </div>
              <div>
                <p className="sub-kicker">From</p>
                <p className="qpage__party">{q.seller.name}</p>
                {q.seller.address ? <p>{q.seller.address}</p> : null}
                {q.seller.email ? (
                  <p>
                    <a className="dash-link" href={`mailto:${q.seller.email}`}>
                      {q.seller.email}
                    </a>
                  </p>
                ) : null}
                {q.seller.gstin ? <p>GSTIN {q.seller.gstin}</p> : null}
              </div>
            </div>
            <p className="dash-note">This quotation is not a tax invoice. The invoice is issued once the payment is confirmed.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
