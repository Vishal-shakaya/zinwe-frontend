/**
 * Rules: the settings on the Rules board (DashRules) that the policy API (GET/PUT devices/policy/) does not hold yet.
 * Everything else on Rules — USB, websites (off / watch / block, the four built-in kinds, custom sites), the data
 * limits, file names in alerts, read-only on a big USB copy, and which remote tools are blocked — is the REAL policy.
 *
 * Sample here (kept for the tab's life, like a server would):
 * - Work hours: "Ask for my OK on breaks longer than", "… when someone ends their day early".
 * - Websites: the Social media / Video streaming kinds, "Always allowed" sites, and the site lists shown in each
 *   kind's "See the list" panel.
 * - Limits: "Web uploads, over".
 * - Remote tools: Allow (no alert) as apart from Watch, custom tools' names, tools taken off the list.
 * - Software: the new-software alerts switch.
 *
 * When the policy grows these fields, `getRulesExtras` / `saveRulesExtras` become part of getPolicy / updatePolicy.
 */
import { sample, sampleStore } from "./index";

export type ExtraCategory = "social" | "video";

export interface RulesExtras {
  /** "0" = never ask; minutes otherwise. */
  breakOk: "0" | "30" | "45" | "60";
  earlyOk: boolean;
  softwareAlerts: boolean;
  /** Web uploads over this many GB alert. */
  uploadLimitGb: number;
  /** Sites that always open, even when a list would block them. */
  allowSites: string[];
  extraCategories: ExtraCategory[];
  /** Remote tools set to Allow: they run with no alert (the API only knows blocked or not). */
  allowTools: string[];
  /** Tools the owner added (name, optional app file "tool.exe"). */
  customTools: Array<{ name: string; exe: string }>;
  /** Built-in tools the owner took off the list (ids). */
  removedTools: string[];
}

const DEFAULTS: RulesExtras = {
  breakOk: "45",
  earlyOk: true,
  softwareAlerts: true,
  uploadLimitGb: 1,
  allowSites: [],
  extraCategories: [],
  allowTools: ["Quick Assist"],
  customTools: [],
  removedTools: [],
};

const store = sampleStore<RulesExtras>("rules", () => structuredClone(DEFAULTS));

/** GET the Rules extras (sample). */
export function getRulesExtras(signal?: AbortSignal): Promise<RulesExtras> {
  return sample(store.get(), signal);
}

/** PUT the Rules extras (sample). */
export function saveRulesExtras(next: RulesExtras): Promise<RulesExtras> {
  store.set(structuredClone(next));
  return sample(next, undefined, 120);
}

/** One built-in website kind's list ("See the list"). Counts are the blocklist sizes; adult names are always masked. */
export interface CategoryList {
  count: string;
  masked?: boolean;
  sites: readonly string[];
}

export const CATEGORY_LISTS: Record<"adult" | "gambling" | "malware" | "phishing", CategoryList> = {
  adult: {
    count: "52,318",
    masked: true,
    sites: ["p•••hub.com", "x•••os.com", "x•••ster.com", "x•••xx.com", "r•••tube.com", "y•••orn.com", "s•••ang.com", "c•••rbate.com", "b•••zers.com", "t•••8.com", "e•••ter.com", "h•••x.com",
      "m•••tube.net", "p•••md.com", "f•••.xxx", "s•••cam.com", "l•••min.com", "x•••ub.com", "n•••ub.com", "t•••lix.com", "i•••.xxx", "a•••tube.com", "d•••ix.com", "v•••ex.com"],
  },
  gambling: {
    count: "1,284",
    sites: ["bet365.com", "1xbet.com", "betway.com", "parimatch.com", "stake.com", "22bet.com", "pokerstars.com", "888casino.com", "williamhill.com", "betfair.com", "dafabet.com", "fun88.com",
      "ladbrokes.com", "paddypower.com", "unibet.com", "bwin.com", "betvictor.com", "10bet.com", "melbet.com", "mostbet.com", "pinnacle.com", "sportingbet.com", "casumo.com", "leovegas.com"],
  },
  malware: {
    count: "9,476",
    sites: ["free-codec-pack.top", "win-update-center.xyz", "driver-fix-pro.click", "cracked-office-2026.site", "flashplayer-update.live", "chrome-security-patch.icu", "pdf-reader-free.monster", "gpu-booster-tool.rest", "activator-office-free.cfd", "java-runtime-fix.top", "antivirus-scan-now.xyz", "whatsapp-desktop-free.click",
      "zoom-installer-setup.top", "teams-meeting-update.xyz", "vlc-media-pro.click", "winrar-full-key.site", "printer-driver-hub.icu", "free-vpn-unlimited.monster", "tally-crack-download.top", "photoshop-free-2026.cfd", "system-cleaner-pro.rest", "browser-speedup.live", "usb-repair-tool.xyz", "font-pack-free.click"],
  },
  phishing: {
    count: "6,215",
    sites: ["paypa1-login.top", "secure-hdfc-verify.xyz", "sbi-kyc-update.click", "icici-netbanking-alert.site", "amaz0n-refund-help.icu", "g00gle-account-check.live", "microsoft-365-signin.monster", "gst-refund-portal.top", "income-tax-refund-in.xyz", "paytm-cashback-claim.click", "linkedln-jobs-verify.site", "netfliix-billing.icu",
      "axis-bank-secure.top", "upi-payment-verify.xyz", "fedex-parcel-hold.click", "indiapost-redelivery.site", "apple-id-locked.icu", "whatsapp-gold-invite.live", "dhl-customs-fee.monster", "yesbank-kyc-verify.top", "aadhaar-update-online.xyz", "zomato-reward-claim.click", "outlook-mailbox-full.site", "flipkart-lucky-draw.icu"],
  },
};
