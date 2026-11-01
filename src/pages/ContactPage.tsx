import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteClients } from "../components/site/SiteClients";
import { Tick } from "../components/site/SiteIcon";
import { COMPANY_EMAIL } from "../content/company";
import { seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { trackEvent } from "../lib/analytics";
import { errorMessage } from "../lib/api";
import { submitContact } from "../lib/api/contact";
import { cx } from "../lib/cx";

const ON_CALL = [
  "Set your first rules together, in plain words",
  "Connect your first PCs and send a test task",
  "Answer your questions about privacy and consent",
];
const SIZES: ReadonlyArray<readonly [string, string]> = [
  ["1-10", "1–10"],
  ["11-25", "11–25"],
  ["26-50", "26–50"],
];
const TOPICS = ["Chat and tasks", "Work hours", "Reports", "USB and file copies", "Remote-control apps", "Privacy and consent"];
const SUBJECTS = ["Is Zinwe right for us?", "Plans and billing", "Partnership", "Something else"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "call" | "msg";
type Field = "name" | "email" | "subject" | "message";

/**
 * Talk to us (board SiteContact): book a setup call or send a message. Both post to POST /api/contact/ (the team gets
 * an email with reply-to = the visitor; the visitor gets "we got your message"); a call request is sent as topic
 * "Setup call" with the PC count and the topics in the message. Validation as drawn (name, email, what it's about),
 * plus a message for "Send a message" — the API needs one. If it can't be sent, everything typed stays and the
 * visitor can email us instead. `?mode=message` opens the message tab.
 */
export default function ContactPage(): ReactElement {
  usePageMeta(seoFor("/contact"));
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "message" ? "msg" : "call");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState("11-25");
  const [topics, setTopics] = useState<string[]>(["Chat and tasks"]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ text: string; field: Field | null; mailto?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ mode: Mode; email: string; first: string; topics: string[] } | null>(null);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  const isCall = mode === "call";

  const fail = (text: string, field: Field) => {
    setError({ text, field });
    refs.current[field]?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return fail("Add your name so we know who to reply to.", "name");
    if (!EMAIL_RE.test(email.trim())) return fail("That email doesn’t look complete. Check it and try again.", "email");
    if (!isCall && !subject) return fail("Pick what the message is about.", "subject");
    if (!isCall && !message.trim()) return fail("Write a few words so we know how to help.", "message");
    setError(null);
    setPending(true);
    const sizeLabel = SIZES.find(([v]) => v === size)?.[1] ?? size;
    const payload = isCall
      ? {
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          topic: "Setup call",
          message: `Book a free setup call.\nPCs: ${sizeLabel}\nCover: ${topics.join(", ") || "whatever you need"}`,
        }
      : { name: name.trim(), email: email.trim(), company: company.trim(), phone: phone.trim(), topic: subject, message: message.trim() };
    try {
      const result = await submitContact(payload);
      if (result.ok) {
        setSent({ mode, email: email.trim(), first: name.trim().split(" ")[0] || "there", topics });
        trackEvent("generate_lead", { lead_source: isCall ? "setup_call" : "contact_form", topic: isCall ? "setup_call" : subject });
      } else if (result.kind === "validation") {
        const fe = result.fieldErrors as Partial<Record<string, string | string[]>>;
        const field: Field | null = fe.name ? "name" : fe.email ? "email" : fe.message ? "message" : null;
        const first = field ? fe[field] : undefined;
        const text = (Array.isArray(first) ? first[0] : first) || result.formError || "Check the form and try again.";
        setError({ text, field, mailto: !field });
        if (field) refs.current[field]?.focus();
      } else if (result.kind === "rate_limited") {
        setError({ text: "That's a lot of messages in a short time. Try again in a little while, or email us.", field: null, mailto: true });
      } else {
        setError({ text: "We couldn't send that just now. Check your connection and try again.", field: null, mailto: true });
      }
    } catch (err) {
      setError({ text: errorMessage(err), field: null, mailto: true });
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setSent(null);
    setName("");
    setEmail("");
    setCompany("");
    setPhone("");
    setSubject("");
    setMessage("");
  };
  const mailto = `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(`Zinwe: ${isCall ? "setup call" : subject || "message"} from ${name.trim() || "the website"}`)}&body=${encodeURIComponent(message.trim())}`;
  const bad = (f: Field) => error?.field === f;

  return (
    <div className="zc">
      <section className="zs-wrap zc-main">
        <div className="zc-left">
          <span className="zs-eyebrow">Contact Zinwe</span>
          <h1 className="zs-h1 zc-h1">A person, not a ticket.</h1>
          <p className="zs-lead">Questions about setup, pricing, consent or whether Zinwe fits your office? Book a free 20-minute call and we set up Zinwe with you: your rules, your first PCs, your first tasks. Or send a message, and the founder replies within one working day.</p>
          <div className="zc-oncall">
            <b>On the call we</b>
            {ON_CALL.map((o) => (
              <span key={o}>
                <Tick />
                {o}
              </span>
            ))}
          </div>
          <dl className="zc-facts">
            <dt>Email</dt>
            <dd>
              <a className="zs-link zc-strong" href={`mailto:${COMPANY_EMAIL}`}>
                {COMPANY_EMAIL}
              </a>
            </dd>
            <dt>Office</dt>
            <dd>SKYTECHNO · New Delhi, India</dd>
            <dt>Hours</dt>
            <dd>Mon–Sat, 10:00–19:00 IST</dd>
            <dt>Replies</dt>
            <dd>Within one working day</dd>
          </dl>
        </div>

        <div className="zc-panel">
          {sent ? (
            <div role="status" className="zc-sent">
              <span className="zc-sent__icon" aria-hidden="true">
                <Tick size={26} className="" />
              </span>
              <h2>{sent.mode === "call" ? `Thanks, ${sent.first}. Check your inbox.` : "Message sent."}</h2>
              <p>
                {sent.mode === "call"
                  ? `We'll email ${sent.email} to pick a 20-minute slot this week. The call covers: ${sent.topics.join(", ") || "whatever you need"}.`
                  : `We reply to ${sent.email} within one working day.`}
              </p>
              <div className="zc-sent__acts">
                <Link className="zs-btn zs-btn--pri zs-btn--flat" to="/signup?plan=free">
                  Start free meanwhile
                </Link>
                <button type="button" className="zs-btn" onClick={reset}>
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <form className="zc-form" onSubmit={(e) => void submit(e)} noValidate>
              <div className="zc-tabs" role="tablist" aria-label="What do you need">
                <button type="button" role="tab" aria-selected={isCall} className={cx("zc-tab", isCall && "is-on")} onClick={() => { setMode("call"); setError(null); }}>
                  Book a setup call
                </button>
                <button type="button" role="tab" aria-selected={!isCall} className={cx("zc-tab", !isCall && "is-on")} onClick={() => { setMode("msg"); setError(null); }}>
                  Send a message
                </button>
              </div>
              <div className="zc-fields">
                <div className="zc-field">
                  <label className="zc-lab" htmlFor="c-name">
                    Your name
                  </label>
                  <input id="c-name" ref={(el) => { refs.current.name = el; }} className={cx("zc-inp", bad("name") && "is-err")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={bad("name") || undefined} aria-describedby={bad("name") ? "c-err" : undefined} />
                </div>
                <div className="zc-field">
                  <label className="zc-lab" htmlFor="c-email">
                    Work email
                  </label>
                  <input id="c-email" ref={(el) => { refs.current.email = el; }} type="email" className={cx("zc-inp", bad("email") && "is-err")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" aria-invalid={bad("email") || undefined} aria-describedby={bad("email") ? "c-err" : undefined} />
                </div>
                <div className="zc-field">
                  <label className="zc-lab" htmlFor="c-company">
                    Company
                  </label>
                  <input id="c-company" className="zc-inp" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
                </div>
                <div className="zc-field">
                  <label className="zc-lab" htmlFor="c-phone">
                    Phone or WhatsApp <span className="zc-opt">(optional)</span>
                  </label>
                  <input id="c-phone" type="tel" className="zc-inp" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                </div>
              </div>
              {isCall ? (
                <>
                  <fieldset className="zc-set">
                    <legend className="zc-lab">How many PCs?</legend>
                    <div className="zc-chips">
                      {SIZES.map(([v, label]) => (
                        <button key={v} type="button" className={cx("zs-chip", size === v && "is-on")} aria-pressed={size === v} onClick={() => setSize(v)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="zc-set">
                    <legend className="zc-lab">
                      What should the call cover? <span className="zc-opt">Pick any</span>
                    </legend>
                    <div className="zc-chips">
                      {TOPICS.map((t) => {
                        const on = topics.includes(t);
                        return (
                          <button key={t} type="button" className={cx("zs-chip", on && "is-on")} aria-pressed={on} onClick={() => setTopics(on ? topics.filter((x) => x !== t) : [...topics, t])}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </>
              ) : (
                <>
                  <fieldset className="zc-set" ref={(el) => { refs.current.subject = el; }} tabIndex={-1}>
                    <legend className="zc-lab">What's it about?</legend>
                    <div className="zc-chips">
                      {SUBJECTS.map((t) => (
                        <button key={t} type="button" className={cx("zs-chip", subject === t && "is-on")} aria-pressed={subject === t} onClick={() => setSubject(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="zc-field">
                    <label className="zc-lab" htmlFor="c-msg">
                      Message
                    </label>
                    <textarea id="c-msg" ref={(el) => { refs.current.message = el; }} className={cx("zc-inp zc-area", bad("message") && "is-err")} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your team and what you'd like to sort out." aria-invalid={bad("message") || undefined} />
                  </div>
                </>
              )}
              {error ? (
                <p id="c-err" role="alert" className="zc-err">
                  {error.text}
                  {error.mailto ? (
                    <>
                      {" "}
                      <a className="zs-link" href={mailto}>
                        Email us instead
                      </a>
                      .
                    </>
                  ) : null}
                </p>
              ) : null}
              <div className="zc-submit">
                <button type="submit" className="zs-btn zs-btn--pri zs-btn--flat" disabled={pending}>
                  {pending ? "Sending…" : isCall ? "Book my setup call" : "Send message"}
                </button>
                <span>{isCall ? "We email you to pick a time. No newsletter, no sharing." : "Replies come from hello@zinwe.io."}</span>
              </div>
            </form>
          )}
        </div>
      </section>

      <div className="zc-members">
        <SiteClients variant="strip" />
      </div>
    </div>
  );
}
