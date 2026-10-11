/** Text normalisers for policy inputs, shared by the controls and the pages. */

/** Turn "https://Sub.Example.com/path" into "sub.example.com"; "" if nothing usable. */
export function normalizeDomain(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  value = value.split("/")[0].split("?")[0].split("#")[0].trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return "";
  return value;
}

/** Trim an executable name and drop a trailing ".exe" (the agent matches the bare name). */
export function normalizeExe(raw: string): string {
  return raw.trim().replace(/\.exe$/i, "");
}
