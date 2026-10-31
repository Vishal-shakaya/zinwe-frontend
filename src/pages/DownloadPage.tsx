import { useEffect, useState, type ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { ICONS } from "../components/site/icons";
import { PhoneFold } from "../components/site/PhoneFold";
import { SiteFaq } from "../components/site/SiteFaq";
import { PathIcon, Tick } from "../components/site/SiteIcon";
import { JsonLd } from "../components/ui/JsonLd";
import {
  AGENT_MSI_NAME,
  AGENT_MSI_URL,
  AGENT_RELEASE,
  DOWNLOAD_CLOSE,
  DOWNLOAD_FAQ,
  DOWNLOAD_HERO,
  NEVERS,
  PATHS,
  PATH_NOTE,
  REQUIREMENTS,
  SILENT_INSTALL,
  WARNS,
  WARN_INTRO,
  type InstallPath,
  type StepMock,
} from "../content/download";
import { fill } from "../content/site/plans";
import { SOFTWARE_LD, seoFor } from "../content/seo";
import { useHashTarget } from "../hooks/useHashTarget";
import { usePageMeta } from "../hooks/usePageMeta";
import { copyText } from "../lib/clipboard";
import { cx } from "../lib/cx";
import { SiteMark } from "../components/site/SiteMark";
import "../styles/site-download.css";

interface InstallerInfo {
  size: string | null;
  updated: string | null;
}

/**
 * Size and date of the published installer, from a HEAD request (nginx serves the file; there's no API for it).
 * Nothing is shown when the file isn't there — e.g. on the local dev server, which answers every path with the app.
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
          size: bytes > 0 ? `${(bytes / 1_048_576).toFixed(1)} MB` : null,
          updated: modified ? new Date(modified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null,
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

function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  return [
    copied,
    (text: string) => {
      void copyText(text).then((ok) => {
        setCopied(ok);
        if (ok) window.setTimeout(() => setCopied(false), 2000);
      });
    },
  ];
}

/** A small picture of the screen for each step. */
function StepMockup({ mock, file, size }: { mock: StepMock; file: string; size: string }): ReactElement {
  switch (mock) {
    case "download":
      return (
        <>
          <span className="zd-file">
            <SiteMark size={28} tile />
            <span className="zd-file__t">
              <b>{file}</b>
              <span>{size ? `${size} · done` : "done"}</span>
            </span>
          </span>
          <span className="zd-mbtn zd-mbtn--start">Open</span>
        </>
      );
    case "connect":
      return (
        <>
          <b>Connect this PC</b>
          <span className="zd-fld">priya@kitecrest.in</span>
          <span className="zd-fld zs-mono">ZM-64P4-M2KY</span>
          <span className="zd-mbtn">Connect</span>
        </>
      );
    case "consent":
      return (
        <>
          <b>Here is what Zinwe records</b>
          <span className="zd-yes">✓ Work hours, app and site names</span>
          <span className="zd-no">✕ Never keystrokes or screens</span>
          <span className="zd-row">
            <span className="zd-fld zd-fld--btn">I don't agree</span>
            <span className="zd-mbtn zd-grow">I agree</span>
          </span>
        </>
      );
    case "tray":
      return (
        <>
          <span className="zd-row zd-row--c">
            <span className="zd-av">PN</span>
            <b>Good morning, Priya</b>
          </span>
          <span className="zd-grid2">
            <span className="zd-mbtn zd-mbtn--green">Start day</span>
            <span className="zd-fld zd-fld--btn">Chat · 2</span>
          </span>
          <span className="zd-hint">Sits by the clock, bottom right</span>
        </>
      );
    case "signup":
      return (
        <>
          <b>Create your free account</b>
          <span className="zd-fld zd-fld--btn">Continue with Google</span>
          <span className="zd-fld">ananya@kitecrest.in</span>
          <span className="zd-mbtn">Start free</span>
        </>
      );
    case "add":
      return (
        <>
          <b>Add a person</b>
          <span className="zd-fld">Priya Nair</span>
          <span className="zd-fld">priya@kitecrest.in</span>
          <span className="zd-mbtn">Send invite</span>
        </>
      );
    case "install":
      return (
        <>
          <span className="zd-cmd">
            <span className="zs-mono zd-cmd__k">ONE PC AT A TIME, OR ALL AT ONCE</span>
            <span className="zs-mono">msiexec /i {file} … /qn</span>
          </span>
          <span className="zd-hint">Each person still agrees on their own PC.</span>
        </>
      );
    case "online":
      return (
        <>
          <b>Team &amp; PCs</b>
          {["Priya Nair", "Arjun Mehta"].map((n) => (
            <span key={n} className="zd-online">
              <span className="zd-online__dot" />
              <b>{n}</b>
              <span>Online</span>
            </span>
          ))}
        </>
      );
  }
}

/**
 * Public /download, v3.1 (board SiteDownload): the big button and the reasons to trust it; two paths (an invite from
 * my company / setting up my office — `#owner` opens the owner path); the Windows warning; what you need, IT mass
 * install and the never-list; questions; close. Release facts: content/download.ts AGENT_RELEASE + a live HEAD of
 * the installer for size and date. Not on a Windows PC (a phone): the page offers to send the link to the PC.
 */
export default function DownloadPage(): ReactElement {
  usePageMeta(seoFor("/download"));
  useHashTarget();
  const { hash } = useLocation();
  const info = useInstallerInfo();
  const [who, setWho] = useState<InstallPath>(() => (hash.includes("owner") ? "owner" : "member"));
  const [shaCopied, copySha] = useCopied();
  const [cmdCopied, copyCmd] = useCopied();
  const [linkCopied, copyLink] = useCopied();
  const windows = onWindowsPc();

  // A link to #owner while already on the page (e.g. from the header) switches the path too.
  const [lastHash, setLastHash] = useState(hash);
  if (hash !== lastHash) {
    setLastHash(hash);
    if (hash.includes("owner")) setWho("owner");
  }

  const size = info?.size ?? "";
  const file = AGENT_MSI_NAME;
  const pageUrl = `${window.location.origin}/download`;
  const mail = `mailto:?subject=${encodeURIComponent("Install Zinwe on this PC")}&body=${encodeURIComponent(
    `Open this on the Windows PC to download Zinwe:\n${pageUrl}`,
  )}`;
  const member = who === "member";
  const note = PATH_NOTE[who];

  return (
    <div className="zd-page">
      {/* 1 · Hero: the promise on the left, the one big download on the right. */}
      <section className="zs-wrap zd-hero">
        <div className="zd-hero__copy">
          <span className="zs-eyebrow">{DOWNLOAD_HERO.eyebrow}</span>
          <h1 className="zs-h1">{DOWNLOAD_HERO.title}</h1>
          <p className="zs-lead">{DOWNLOAD_HERO.lead}</p>
          <ul className="zd-facts">
            {DOWNLOAD_HERO.facts.map((f) => (
              <li key={f}>
                <Tick size={15} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="zs-card zd-get">
          <div className="zd-get__head">
            <SiteMark size={56} tile label />
            <span className="zd-get__t">
              <b>Zinwe {AGENT_RELEASE.version}</b>
              <span>{[size, "Windows 10 and 11", "64-bit"].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="zs-pill tone-green">Latest</span>
          </div>
          <a className="zs-btn zs-btn--pri zd-get__btn" href={AGENT_MSI_URL} download={AGENT_MSI_NAME}>
            <PathIcon d={ICONS.download} size={20} stroke={2.2} />
            Download for Windows
          </a>
          {!windows ? (
            <div className="zd-away" role="note">
              <b>Open this page on the Windows PC.</b> Zinwe installs on Windows 10 and 11 PCs, not on this device.
              <span className="zd-away__acts">
                <a className="zs-btn zs-btn--sm" href={mail}>
                  Email me the link
                </a>
                <button type="button" className="zs-btn zs-btn--sm" onClick={() => copyLink(pageUrl)}>
                  {linkCopied ? "Link copied" : "Copy link"}
                </button>
              </span>
            </div>
          ) : null}
          <div className="zd-get__meta">
            <span>
              {file}
              {info?.updated ? ` · ${info.updated}` : ""}
            </span>
            <Link className="zs-link zd-strong" to="/whats-new">
              What's new in {AGENT_RELEASE.version} →
            </Link>
          </div>
          {AGENT_RELEASE.sha256 ? (
            <details className="zd-sha">
              <summary>
                <span className="zd-sha__l">
                  <PathIcon d={ICONS.shieldCheck} size={15} stroke={2.2} className="zs-tick" />
                  Check the file is genuine (SHA-256)
                </span>
                <span className="zd-sha__plus" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="zd-sha__body">
                <span className="zd-sha__copy">
                  <button type="button" className="zs-btn zs-btn--sm" onClick={() => copySha(AGENT_RELEASE.sha256 ?? "")}>
                    {shaCopied ? "Copied" : "Copy"}
                  </button>
                </span>
                <code className="zs-mono">{AGENT_RELEASE.sha256}</code>
                <span className="zd-sha__how">
                  In PowerShell, in your Downloads folder, run <code className="zs-mono">Get-FileHash .\{file}</code>. The Hash it shows must
                  match this one.
                </span>
              </div>
            </details>
          ) : null}
          <p className="zd-roadmap">Mac and Linux are on our roadmap.</p>
        </div>
      </section>

      {/* 2 · Two paths: most people here were sent an invite; owners are setting up. */}
      <section id="steps" className="zs-wrap zd-steps">
        <div className="zd-steps__head">
          <h2 className="zd-h2">From download to working in four steps.</h2>
          <p>Pick the one that's you.</p>
        </div>
        <span id="owner" className="zd-anchor" aria-hidden="true" />
        <div className="zd-who" role="tablist" aria-label="Who is installing">
          <button type="button" role="tab" id="zd-tab-member" aria-selected={member} aria-controls="zd-panel" className={cx("zd-who__b", member && "is-on")} onClick={() => setWho("member")}>
            <PathIcon d={ICONS.mail} size={17} />I got an invite from my company
          </button>
          <button type="button" role="tab" id="zd-tab-owner" aria-selected={!member} aria-controls="zd-panel" className={cx("zd-who__b", !member && "is-on")} onClick={() => setWho("owner")}>
            <PathIcon d={ICONS.building} size={17} />
            I'm setting up my office
          </button>
        </div>
        <ol id="zd-panel" role="tabpanel" aria-labelledby={`zd-tab-${who}`} className="zd-list">
          {PATHS[who].map((st, i) => (
            <li key={st.t} className="zs-card zd-step">
              <div className="zd-mock" aria-hidden="true">
                <StepMockup mock={st.mock} file={file} size={size} />
              </div>
              <span className="zs-mono zd-step__n">STEP {i + 1}</span>
              <b className="zd-step__t">{st.t}</b>
              <span className="zd-step__b">{st.b}</span>
            </li>
          ))}
        </ol>
        <p className="zd-pathnote">
          {note.note}{" "}
          <Link className="zs-link zd-strong" to={note.to}>
            {note.link}
          </Link>
        </p>
      </section>

      {/* 3 · The Windows warning, made calm: why it shows, then three clicks. */}
      <section id="warn" className="zs-wrap zd-warnwrap">
        <div className="zs-card zd-warn">
          <div className="zd-warn__head">
            <span className="zs-eyebrow">{WARN_INTRO.eyebrow}</span>
            <h2 className="zd-h2 zd-h2--32">{WARN_INTRO.title}</h2>
            <p>{WARN_INTRO.body}</p>
          </div>
          <PhoneFold label="Show me the three clicks">
            <div className="zd-warns">
            {WARNS.map((w, i) => (
              <div key={w.t} className="zd-w">
                <span className="zd-w__t">
                  <span className="zd-w__n">{i + 1}</span>
                  <b>{w.t}</b>
                </span>
                <div className="zd-dlg" aria-hidden="true">
                  <b>{fill(w.dlgTitle, { file })}</b>
                  <span className="zd-dlg__txt">{fill(w.dlgText, { file })}</span>
                  <span className="zd-dlg__acts">
                    <span className="zd-dlg__ok">{w.ok}</span>
                    <span className="zd-dlg__no">{w.cancel}</span>
                  </span>
                </div>
                <span className="zd-w__b">{w.b}</span>
              </div>
            ))}
          </div>
          </PhoneFold>
        </div>
      </section>

      {/* 4 · Requirements, IT helpers and the never-list, side by side. */}
      <section className="zs-wrap zd-three">
        <div className="zs-card zd-box">
          <span className="zs-eyebrow">What you need</span>
          <dl className="zd-reqs">
            {REQUIREMENTS.filter((q) => q.v !== "{size}" || size).map((q) => (
              <div key={q.k} className="zd-req">
                <dt>{q.k}</dt>
                <dd>{fill(q.v, { size })}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="zd-box zd-box--dark">
                    <PhoneFold
            label="For IT helpers: install on many PCs"
            wide={
              <>
                <span className="zs-eyebrow zd-on-dark">For IT helpers</span>
                <b className="zd-box__h">Install on many PCs at once.</b>
              </>
            }
          >
          <span className="zd-box__p">Push the same installer with your usual tools. The PC connects by itself; the person still agrees on their own PC.</span>
          <div className="zd-it">
            <code className="zs-mono">{SILENT_INSTALL}</code>
            <button type="button" className="zd-it__copy" onClick={() => copyCmd(SILENT_INSTALL)}>
              {cmdCopied ? "Copied" : "Copy command"}
            </button>
          </div>
          </PhoneFold>
        </div>
        <div className="zs-card zd-box">
          <span className="zs-eyebrow">Safe to install</span>
          <b className="zd-box__h">What Zinwe never does.</b>
          <ul className="zs-ticks zd-nevers">
            {NEVERS.map((n) => (
              <li key={n}>
                <Tick size={17} />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="zs-wrap zs-qa zd-faq">
        <div className="zs-qa__intro">
          <span className="zs-eyebrow">Before you install</span>
          <h2 className="zd-h2 zd-h2--32">Installing Zinwe: common questions.</h2>
          <p>
            Stuck?{" "}
            <Link className="zs-link" to="/contact">
              We'll help you set up
            </Link>
            .
          </p>
        </div>
        <SiteFaq items={DOWNLOAD_FAQ} compact />
      </section>

      <section className="zs-wrap zd-closewrap">
        <div className="zd-close">
          <div className="zd-close__copy">
            <h2>{DOWNLOAD_CLOSE.title}</h2>
            <p>{DOWNLOAD_CLOSE.body}</p>
          </div>
          <div className="zs-close__acts">
            <Link className="zs-btn zs-btn--dark" to="/signup?plan=free">
              Start free
            </Link>
            <Link className="zs-btn zs-btn--white" to="/contact">
              Book a setup call
            </Link>
          </div>
        </div>
      </section>
      <JsonLd data={SOFTWARE_LD} />
    </div>
  );
}
