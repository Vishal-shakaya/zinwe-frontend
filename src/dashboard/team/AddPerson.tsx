import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";
import { createMember, MEMBER_ROLES, setMemberRole, type Member, type MemberField, type MemberRole } from "../../lib/api";
import { copyText } from "../../lib/clipboard";
import { apiFieldErrors, apiFormError } from "../../portal/failure";
import { CopyDetails } from "../components/CopyDetails";
import { savePhoto, type MemberPhoto } from "../fixtures/photos";
import { downloadPage } from "../features/invite";
import { PictureArt } from "./Avatar";
import { frameStyle, shrinkPhoto } from "./photo";
import { firstName } from "./format";

const FIELDS: readonly MemberField[] = ["name", "email"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Draft {
  name: string;
  email: string;
  role: MemberRole;
  photo: Extract<MemberPhoto, { kind: "photo" }> | null;
}

const EMPTY: Draft = { name: "", email: "", role: "developer", photo: null };

/**
 * DashTeam "Add a person": inline under the header on desktop, a full-screen sheet (ends above the tab bar) with
 * the Add button sticky at its bottom on a phone. Name, work email, role, optional photo → POST members/ (the
 * server emails the invite), then the role is saved; the done step shows the three things to send them.
 */
export function AddPerson({
  slotLine,
  onCreated,
  onClose,
}: {
  slotLine: string;
  onCreated: (member: Member) => void;
  onClose: () => void;
}): ReactElement {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [added, setAdded] = useState<Member | null>(null);
  const [copied, setCopied] = useState<"" | "all" | "newid" | "fail">("");
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (added) titleRef.current?.focus();
    else document.getElementById("n-name")?.focus();
  }, [added]);

  // On a phone the form is a full-screen sheet, so Escape closes it there (on desktop it is inline and keeps the draft).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || window.innerWidth > 760) return;
      if (document.querySelector('[role="dialog"]')) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const shrunk = await shrinkPhoto(file);
      set("photo", { kind: "photo", ...shrunk });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That picture couldn't be used.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const create = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pending) return;
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) {
      setError("Add their name.");
      document.getElementById("n-name")?.focus();
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Add their full work email; the invite goes there.");
      document.getElementById("n-email")?.focus();
      return;
    }
    setPending(true);
    setError("");
    try {
      let member = await createMember({ name, email });
      try {
        member = await setMemberRole(member.id, draft.role);
      } catch {
        /* The person is added; the role can be set on their card. */
      }
      if (draft.photo) savePhoto(member.id, draft.photo);
      onCreated(member);
      setAdded(member);
      setCopied("");
    } catch (err) {
      const fieldErrors = apiFieldErrors(err, FIELDS);
      setError(fieldErrors.email ?? fieldErrors.name ?? apiFormError(err, FIELDS) ?? "We couldn't add them. Try again.");
    } finally {
      setPending(false);
    }
  };

  const addAnother = () => {
    setAdded(null);
    setCopied("");
    setDraft(EMPTY);
  };

  const copyId = async () => {
    if (!added) return;
    setCopied((await copyText(added.member_id)) ? "newid" : "fail");
  };

  const dl = downloadPage();
  const first = added ? firstName(added.name) : "";

  return (
    <section id="add-sheet" className="z-card zt-add" aria-label="Add a person">
      {added ? (
        <>
          <div className="zt-done-head">
            <span className="zt-done-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="zt-done-text">
              <h2 id="added-title" ref={titleRef} tabIndex={-1}>
                {added.name} is added
              </h2>
              <span>We emailed {added.email} their Member ID and the download link. Their PC appears here once they connect and agree.</span>
            </div>
          </div>
          {/* What the new person needs, in order. Copy all puts the three steps on the clipboard to paste anywhere. */}
          <div className="zt-send" role="group" aria-labelledby="send-title">
            <div className="zt-send__head">
              <b id="send-title">Send {first} this</b>
              <CopyDetails member={added} onCopied={(ok) => setCopied(ok ? "all" : "fail")} />
            </div>
            <ol className="zt-steps">
              <li>
                <span className="zt-step" aria-hidden="true">
                  1
                </span>
                <span>
                  Download Zinwe:{" "}
                  <a className="z-mono" href={dl.href} target="_blank" rel="noopener" style={{ fontWeight: 600 }}>
                    {dl.label}
                  </a>
                </span>
              </li>
              <li>
                <span className="zt-step" aria-hidden="true">
                  2
                </span>
                <span>
                  Work email <b>{added.email}</b> and Member ID
                </span>
                <b className="z-mono zt-newid">{added.member_id}</b>
                <button type="button" className="z-btn sm" onClick={() => void copyId()} aria-label={`Copy Member ID ${added.member_id}`}>
                  {copied === "newid" ? "Copied" : "Copy"}
                </button>
              </li>
              <li>
                <span className="zt-step" aria-hidden="true">
                  3
                </span>
                <span>Open Zinwe and agree on screen</span>
              </li>
            </ol>
            <span role="status" className="zt-ok-note">
              {copied === "all"
                ? "All three steps copied. Paste them into an email or chat."
                : copied === "newid"
                  ? "Member ID copied."
                  : copied === "fail"
                    ? "Couldn't copy. Select the text and copy it instead."
                    : ""}
            </span>
          </div>
          <div className="zt-add-act zt-add-act--end">
            <button type="button" className="z-btn sm" onClick={addAnother}>
              Add another
            </button>
            <button type="button" className="z-btn sm dark" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <form className="zt-add-form" onSubmit={(e) => void create(e)} noValidate>
          <div className="zt-add-top">
            <h2>Add a person</h2>
            <button type="button" className="z-btn sm" onClick={onClose}>
              Cancel
            </button>
          </div>
          <div className="zt-add-grid">
            <div className="zt-fld">
              <label className="zt-lab" htmlFor="n-name">
                Name
              </label>
              <input
                id="n-name"
                className="zt-inp"
                autoComplete="off"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Rohan Iyer"
                aria-invalid={error === "Add their name." ? true : undefined}
              />
            </div>
            <div className="zt-fld">
              <label className="zt-lab" htmlFor="n-email">
                Work email
              </label>
              <input
                id="n-email"
                type="email"
                inputMode="email"
                className="zt-inp"
                autoComplete="off"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="rohan@kitecrestdigital.com"
                aria-invalid={error.startsWith("Add their full work email") ? true : undefined}
              />
            </div>
            <div className="zt-fld">
              <label className="zt-lab" htmlFor="n-role">
                Role
              </label>
              <select id="n-role" className="zt-inp" value={draft.role} onChange={(e) => set("role", e.target.value as MemberRole)}>
                {MEMBER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="zt-fld">
            <span className="zt-lab">
              Photo <span style={{ fontWeight: 400, color: "#6B6459" }}>(optional)</span>
            </span>
            <div className="zt-photo-row">
              {draft.photo ? (
                <span style={frameStyle(48)}>
                  <PictureArt photo={draft.photo} size={48} label="Photo for the new person" />
                </span>
              ) : (
                <span className="zt-photo-empty" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
              )}
              <label className="z-btn sm zt-upl">
                <input type="file" accept="image/*" onChange={(e) => void onPhoto(e)} disabled={photoBusy} />
                {photoBusy ? "Shrinking…" : draft.photo ? "Upload a different photo" : "Upload photo"}
              </label>
              {draft.photo ? (
                <button type="button" className="z-btn sm" onClick={() => set("photo", null)}>
                  Remove
                </button>
              ) : null}
              {draft.photo ? (
                <span role="status" className="zt-ok-note">
                  Compressed to {draft.photo.kb} KB
                </span>
              ) : null}
            </div>
            <span className="zt-hint">Any photo works; we shrink it to 256 × 256 px (about 100 KB). Leave it empty and we show their initials.</span>
          </div>
          {/* The server always emails the invite today, so this stays on (see the Track D report). */}
          <label className="zt-check">
            <input type="checkbox" checked disabled readOnly />
            Email them the invite with their Member ID and download link
          </label>
          {error ? (
            <p role="alert" className="zt-err">
              {error}
            </p>
          ) : null}
          <div className="zt-add-act">
            <span className="zt-slot">{slotLine}</span>
            <button type="submit" className="z-btn dark" disabled={pending} aria-busy={pending || undefined}>
              {pending ? "Adding…" : "Add person"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
