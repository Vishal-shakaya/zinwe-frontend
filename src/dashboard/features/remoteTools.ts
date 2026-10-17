/**
 * The remote-control tools the Zinwe agent recognises by name (window-app RemoteToolCatalog.BuiltInTools,
 * display names). The block list offers these to pick from, and a typed name is matched to one of them so
 * "anydesk" is saved as "AnyDesk" (J5-24).
 */
export const KNOWN_REMOTE_TOOLS: readonly string[] = [
  "AnyDesk",
  "TeamViewer",
  "UltraViewer",
  "RustDesk",
  "Chrome Remote Desktop",
  "Quick Assist",
  "Windows Remote Assistance",
  "VNC",
  "Ammyy Admin",
  "Supremo",
  "GoToMyPC",
  "LogMeIn",
  "ScreenConnect",
  "Splashtop",
  "DWService",
  "Remote Utilities",
  "Radmin",
];

/** Program names (no ".exe") the agent maps to a tool, for matching what an owner types. */
const EXE_TO_TOOL: Record<string, string> = {
  anydesk: "AnyDesk",
  teamviewer: "TeamViewer",
  ultraviewer: "UltraViewer",
  rustdesk: "RustDesk",
  winvnc: "VNC",
  tvnserver: "VNC",
  aa_v3: "Ammyy Admin",
  supremo: "Supremo",
  quickassist: "Quick Assist",
  msra: "Windows Remote Assistance",
  logmein: "LogMeIn",
  splashtop: "Splashtop",
  radmin: "Radmin",
  remoting_host: "Chrome Remote Desktop",
};

function squash(value: string): string {
  return value.toLowerCase().replace(/\.exe$/, "").replace(/[\s_-]+/g, "");
}

/** The known tool a typed name means ("anydesk", "AnyDesk.exe", "team viewer"), or null. */
export function knownTool(raw: string): string | null {
  const key = squash(raw.trim());
  if (!key) return null;
  const byName = KNOWN_REMOTE_TOOLS.find((tool) => squash(tool) === key);
  if (byName) return byName;
  const byExe = Object.entries(EXE_TO_TOOL).find(([exe]) => squash(exe) === key);
  return byExe ? byExe[1] : null;
}
