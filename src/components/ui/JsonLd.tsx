import type { ReactElement } from "react";

/**
 * schema.org structured data as a <script type="application/ld+json">. No "<" survives inside the
 * script, so nothing in the data can close or confuse the tag.
 */
export function JsonLd({ data }: { data: unknown }): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
