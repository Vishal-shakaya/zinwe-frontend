import type { ReactElement } from "react";
import { linkTokens } from "../../lib/linkify";
import { CopyButton } from "./CopyButton";

const WHAT = { url: "link", email: "email address", phone: "phone number" } as const;

/** Chat text with its links, emails and phone numbers clickable, each with a copy button (FR-12). */
export function Linkified({ text }: { text: string }): ReactElement {
  return (
    <>
      {linkTokens(text).map((t, i) =>
        t.kind === "text" ? (
          <span key={i}>{t.text}</span>
        ) : (
          <span key={i} className="chat-link">
            <a
              href={t.href}
              {...(t.kind === "url" ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
            >
              {t.text}
            </a>
            <CopyButton text={t.text} what={WHAT[t.kind]} iconOnly className="chat-link__copy" />
          </span>
        ),
      )}
    </>
  );
}
