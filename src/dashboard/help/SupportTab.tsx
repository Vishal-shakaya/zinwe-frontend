import { useState, type FormEvent, type ReactElement } from "react";
import { ApiError, errorMessage, openSupportTicket } from "../../lib/api";
import { openSupport, showSupportButton } from "./supportBridge";
import { Spinner } from "../ui/States";
import { useTip } from "../ui/useTip";
import { TipBody } from "../ui/Tooltip";

const FAQS: ReadonlyArray<[string, string]> = [
  ["A PC says Offline. Is it still protected?", "Yes. Rules keep working with the last settings, and work times are saved on the PC until it reconnects."],
  ["Someone lost their Member ID or left.", "Open Team & PCs. Copy their ID again, or Remove them to free the PC slot."],
  ["How fast do rule changes reach PCs?", "Within about a minute for PCs that are online."],
  ["Can my team see Zinwe is running?", "Yes. The Zinwe window is in the taskbar corner and lists what it records."],
];

/**
 * Help → Support (board DashHelp): message the Zinwe team (a real support conversation, POST support/tickets/,
 * answered by email and in the floating Support panel), bring back a hidden Support button, and common questions.
 */
export function SupportTab({ email }: { email: string }): ReactElement {
  const tip = useTip();
  const [ask, setAsk] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [faq, setFaq] = useState(0);
  const [shown, setShown] = useState(false);
  const empty = !ask.trim();

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (empty || sending) return;
    setSending(true);
    setError(null);
    try {
      await openSupportTicket({ category: "question", message: ask.trim(), page: "/app/help#tab=support" });
      setAsked(true);
      setAsk("");
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.message?.[0] ?? errorMessage(err)) : errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="zh-split">
      <section className="z-card zp-card" aria-labelledby="sup-h" style={{ flex: "999 1 420px", gap: 12 }}>
        <h2 id="sup-h" style={{ fontSize: 18 }}>
          Message the Zinwe team
        </h2>
        <span className="zp-body">A person replies by email within one working day, Mon–Sat 10:00–19:00 IST.</span>
        {asked ? (
          <div className="zh-sent" role="status">
            Sent. We'll reply to {email || "your email"}, usually within a few hours.
            <button type="button" className="zp-linkbtn" style={{ display: "block", marginTop: 6, color: "#A84505" }} onClick={openSupport}>
              Open the conversation
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void send(e)} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label htmlFor="q" style={{ fontWeight: 600 }}>
              What do you need help with?
            </label>
            <textarea
              id="q"
              rows={5}
              className="zh-text"
              value={ask}
              maxLength={4000}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="For example: a PC shows Offline but it's switched on."
            />
            {error ? (
              <span className="zp-err" role="alert">
                {error}
              </span>
            ) : null}
            <div className="zp-save" style={{ justifyContent: "space-between" }}>
              <span className="zp-k">We attach your plan and Zinwe versions so you don't have to.</span>
              <button
                type="submit"
                className={`z-btn pri${sending ? " is-busy" : ""}`}
                aria-disabled={empty || undefined}
                disabled={sending}
                {...(empty ? tip.anchor("ask", <TipBody text={<><b>Send is off</b> — write what you need help with first.</>} />) : {})}
              >
                {sending ? <Spinner size={16} tone="on-orange" /> : null}
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
        <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button type="button" className="zp-linkbtn" onClick={openSupport}>
            Your conversations with us
          </button>
          <button
            type="button"
            className="zp-linkbtn"
            onClick={() => {
              showSupportButton();
              setShown(true);
            }}
          >
            {shown ? "The Support button is back, bottom right" : "Hid the Support button? Show it again"}
          </button>
        </span>
      </section>
      <section className="z-card zp-card" aria-labelledby="faq-h" style={{ flex: "1 1 320px", gap: 4 }}>
        <h2 id="faq-h" style={{ fontSize: 18, marginBottom: 8 }}>
          Common questions
        </h2>
        {FAQS.map(([q, a], i) => (
          <div key={q} style={{ borderTop: "1px solid #F5F5F5" }}>
            <button type="button" className="zhp-faq" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>
              <span>{q}</span>
              <span aria-hidden="true" style={{ color: "#A84505" }}>
                {faq === i ? "−" : "+"}
              </span>
            </button>
            {faq === i ? <p style={{ margin: "0 0 12px", color: "#404040" }}>{a}</p> : null}
          </div>
        ))}
      </section>
      {tip.node}
    </div>
  );
}
