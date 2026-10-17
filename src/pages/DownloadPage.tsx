import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { OfferBand } from "../components/home/OfferBand";
import { Icon } from "../components/ui/Icon";
import { JsonLd } from "../components/ui/JsonLd";
import { Reveal } from "../components/ui/Reveal";
import { Smoke } from "../components/ui/Smoke";
import { StaggerTitle } from "../components/ui/StaggerTitle";
import {
  AGENT_MSI_NAME,
  AGENT_MSI_URL,
  DOWNLOAD_FAQ,
  DOWNLOAD_NEEDS,
  DOWNLOAD_STEPS,
  SILENT_INSTALL,
} from "../content/download";
import { SOFTWARE_LD, seoFor } from "../content/seo";
import { usePageMeta } from "../hooks/usePageMeta";
import { copyText } from "../lib/clipboard";

interface InstallerInfo {
  size: string | null;
  updated: string | null;
}

/**
 * Size and date of the published installer, read from a HEAD request (the file itself is served by
 * nginx, so there's no API for it). Nothing is shown when the file isn't there — e.g. on the local dev
 * server, which answers every path with the app's HTML.
 */
function useInstallerInfo(): InstallerInfo | null {
  const [info, setInfo] = useState<InstallerInfo | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(AGENT_MSI_URL, { method: "HEAD", signal: controller.signal })
      .then((res) => {
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || type.includes("text/html")) return;
        const bytes = Number(res.headers.get("content-length"));
        const modified = res.headers.get("last-modified");
        setInfo({
          size: bytes > 0 ? `${Math.round(bytes / 1_048_576)} MB` : null,
          updated: modified
            ? new Date(modified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : null,
        });
      })
      .catch(() => {
        /* offline or blocked: the button still works, we just don't show size and date */
      });
    return () => controller.abort();
  }, []);
  return info;
}

/** A Windows desktop browser (where the installer can run). Phones, Macs, Linux and ChromeOS can't use it. */
function onWindowsPc(): boolean {
  try {
    const ua = navigator.userAgent;
    return /Windows NT/i.test(ua) && !/Windows Phone|Mobile/i.test(ua);
  } catch {
    return true;
  }
}

/**
 * Not on a Windows PC (a phone, usually): the installer is useless here. Send the page to the PC instead:
 * email it to yourself, share it, or copy the link. "Download anyway" stays for copying it to a USB drive.
 */
function SendToPc(): ReactElement {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/download`;
  const canShare = typeof navigator.share === "function";
  const mail = `mailto:?subject=${encodeURIComponent("Install Zinwe on this PC")}&body=${encodeURIComponent(
    `Open this on the Windows PC to download Zinwe:\n${url}`,
  )}`;
  return (
    <div className="dl-away" role="note" aria-labelledby="dl-away-title">
      <p className="dl-away__title" id="dl-away-title">
        Open this page on the Windows PC
      </p>
      <p className="dl-away__text">
        Zinwe installs on Windows 10 and 11 PCs, not on this device. Send yourself the link and open it on the PC you
        want to protect.
      </p>
      <div className="dl-away__actions">
        <a className="btn btn--primary" href={mail}>
          Email me the link
        </a>
        {canShare ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              void navigator.share({ title: "Download Zinwe for Windows", url }).catch(() => undefined);
            }}
          >
            Share link
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            void copyText(url).then((ok) => {
              setCopied(ok);
              if (ok) window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
      <a className="dl-away__anyway" href={AGENT_MSI_URL} download={AGENT_MSI_NAME}>
        Download the installer anyway (to copy it to the PC)
      </a>
    </div>
  );
}

/** After the download starts: what to do with the file. */
function NextSteps(): ReactElement {
  return (
    <div className="dl-next" role="status">
      <p className="dl-next__title">Download started. Next:</p>
      <ol className="dl-next__list">
        <li>Open ZinweAgent.msi from the Downloads folder and choose Yes when Windows asks.</li>
        <li>The Zinwe widget opens: enter the person's work email and Member ID, then click Connect.</li>
        <li>They read what's shared and agree. The PC shows up in your dashboard within about a minute.</li>
      </ol>
    </div>
  );
}

/** "Copy" for the silent-install command. */
function CopyCommand({ text }: { text: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <div className="dl-code">
      <code>{text}</code>
      <button
        type="button"
        className="btn btn--ghost dl-code__copy"
        onClick={() => {
          void copyText(text).then((ok) => {
            setCopied(ok);
            if (ok) window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/**
 * /download — the Windows installer and how to set up a PC: what it needs, four steps, silent install
 * for IT, what Zinwe never does, and the questions people ask first. Owners don't install anything for
 * themselves; this page is for the PCs they protect (and the link in every member's invite email).
 */
export default function DownloadPage(): ReactElement {
  usePageMeta(seoFor("/download"));
  const { token } = useAuth();
  const installer = useInstallerInfo();
  const [windows] = useState(onWindowsPc);
  const [started, setStarted] = useState(false);
  const meta = ["Windows 10 and 11", "64-bit", "MSI installer", installer?.size, installer?.updated && `updated ${installer.updated}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="page-hero zin-host">
        <Smoke />
        <div className="wrap split dl-hero">
          <div>
            <p className="eyebrow fade">Download</p>
            <StaggerTitle text={seoFor("/download").h1} />
            <p className="lede fade" style={{ animationDelay: ".4s" }}>
              Install one small app on each of your team's Windows 10 or 11 PCs. Connect it with the person's work
              email and Member ID, and the PC shows up in your dashboard within about a minute.
            </p>
            <div className="dl-cta fade" style={{ animationDelay: ".55s" }}>
              {windows ? (
                <>
                  <a
                    className="btn btn--primary btn--lg dl-cta__btn"
                    href={AGENT_MSI_URL}
                    download={AGENT_MSI_NAME}
                    onClick={() => setStarted(true)}
                  >
                    <Icon name="windows" />
                    Download for Windows
                  </a>
                  <p className="dl-cta__meta">{meta}</p>
                  {started ? <NextSteps /> : null}
                </>
              ) : (
                <SendToPc />
              )}
            </div>
          </div>

          <aside className="dl-card fade" style={{ animationDelay: ".7s" }} aria-labelledby="dl-needs-title">
            <h2 className="dl-card__title" id="dl-needs-title">
              What you need
            </h2>
            <ul className="dl-needs">
              {DOWNLOAD_NEEDS.map((need) => (
                <li key={need}>
                  <Icon name="check" />
                  <span>{need}</span>
                </li>
              ))}
            </ul>
            <p className="dl-card__foot">
              No Member ID yet?{" "}
              {token ? (
                <Link className="link-arrow" to="/app/team">
                  Add the person in your dashboard <span className="arr">→</span>
                </Link>
              ) : (
                <Link className="link-arrow" to="/signup?plan=free">
                  Create your free account <span className="arr">→</span>
                </Link>
              )}
            </p>
          </aside>
        </div>
      </section>

      <section className="sec sec--paper" aria-labelledby="dl-steps-title">
        <div className="wrap">
          <Reveal className="sec-head">
            <p className="eyebrow">Setup</p>
            <h2 className="h-section" id="dl-steps-title">
              From download to protected in four steps.
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <ol className="dl-steps">
              {DOWNLOAD_STEPS.map((step, i) => (
                <li key={step.title} className="dl-step">
                  <span className="dl-step__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="dl-step__title">{step.title}</h3>
                  <p className="dl-step__body">{step.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split dl-split">
          <Reveal>
            <p className="eyebrow">For IT teams</p>
            <h2 className="h-section">Install on many PCs at once.</h2>
            <p className="lede">
              Push the same installer with your usual tools. A silent install connects the PC straight away; the person
              still sees the Zinwe widget and agrees on their own PC.
            </p>
            <CopyCommand text={SILENT_INSTALL} />
          </Reveal>
          <Reveal delay={1}>
            <p className="eyebrow">Safe to install</p>
            <h2 className="h-section">What Zinwe never does.</h2>
            <ul className="dl-needs dl-needs--plain">
              <li>
                <Icon name="check" />
                <span>Never records keystrokes, screens, or what's inside files, emails or messages.</span>
              </li>
              <li>
                <Icon name="check" />
                <span>No kernel driver: it runs as a standard Windows service and a small widget.</span>
              </li>
              <li>
                <Icon name="check" />
                <span>Keeps protecting with its last rules when the PC is offline.</span>
              </li>
              <li>
                <Icon name="check" />
                <span>Uninstalling removes its USB rules, so no PC is left locked.</span>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="sec sec--paper" aria-labelledby="dl-faq-title">
        <div className="wrap faq">
          <Reveal className="sec-head">
            <p className="eyebrow">Questions</p>
            <h2 className="h-section" id="dl-faq-title">
              Before you install
            </h2>
            <p className="lede">
              Something else?{" "}
              <Link className="link-arrow" to="/contact">
                Ask us <span className="arr">→</span>
              </Link>
            </p>
          </Reveal>
          <Reveal className="faq__list" delay={1}>
            {DOWNLOAD_FAQ.map(({ q, a }, i) => (
              <details key={q} className="faq__item" open={i === 0}>
                <summary className="faq__q">
                  <span>{q}</span>
                  <span className="faq__mark" aria-hidden="true" />
                </summary>
                <p className="faq__a">{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {token ? null : (
        <OfferBand title="No account yet? Start free." sub="Protect up to 3 PCs at no cost, for as long as you like." note="No card needed." />
      )}
      <JsonLd data={SOFTWARE_LD} />
    </>
  );
}
