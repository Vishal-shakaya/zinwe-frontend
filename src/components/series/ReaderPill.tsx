import type { ReactElement } from "react";
import type { Reader } from "../../lib/api/series";

/** "Members' edition · reading as r•••@example.com · Not you?" (forgets this browser's reader key). */
export function ReaderPill({ reader, onForget }: { reader: Reader; onForget: () => void }): ReactElement {
  return (
    <p className="sx-reader">
      <span className="sx-reader__dot" aria-hidden="true" />
      Members' edition · reading as <b>{reader.email}</b>
      <button type="button" onClick={onForget}>
        Not you?
      </button>
    </p>
  );
}
