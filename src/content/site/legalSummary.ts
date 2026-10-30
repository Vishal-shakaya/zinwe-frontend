/**
 * /legal summaries (board SiteLegal, 29 Oct 2026), word for word. Short plain-word summaries; the full texts in
 * content/legal.ts (/legal/<slug>) are what count. Footer links land here on #terms, #privacy, #refunds, #cookies, #aup.
 * Legal wording changes go through the owner (.claude/marketing/context.md §3 rule 5).
 */
import type { LegalSlug } from "../legal.ts";

export interface PolicySummary {
  id: string;
  slug: LegalSlug;
  toc: string;
  title: string;
  sum: string;
  points: readonly string[];
  updated?: string;
  full: string;
}

export const LEGAL_SUMMARY_UPDATED = "Last updated 23 October 2026 · SKYTECHNO, New Delhi, India";

export const POLICY_SUMMARIES: readonly PolicySummary[] = [
  {
    id: "terms",
    slug: "terms",
    toc: "Terms and Conditions",
    title: "Terms and Conditions",
    sum: "The agreement for using Zinwe: who it's for, your responsibilities, billing and liability.",
    points: [
      "Zinwe is run by SKYTECHNO, a proprietorship in New Delhi, India. By creating an account or using Zinwe you agree to these terms. If you sign up for a business, you confirm you can agree on its behalf.",
      "Zinwe is for lawful monitoring of your own employees or contractors, on company-owned or company-managed devices. Never personal devices you don't control, a spouse or family member, or anyone outside a genuine work relationship.",
      "Following the law where you are is your job. In India (DPDP Act, 2023) a clause in an offer letter is not valid consent: use Zinwe's consent screen for each person. In the US, give the written notice your state requires before monitoring starts.",
      "Priced flat by PCs, not per seat, in four plans: Free forever (up to 3 PCs), Startups (10), Teams (25) and Businesses (50). India pays in rupees plus GST; outside India pays in US dollars, without Indian GST.",
      "You choose monthly or yearly each time you pay. Each payment covers one billing period and nothing is charged automatically. Online payments (Razorpay) switch the plan on when confirmed; bank transfer or Skydo usually within one working day. Every payment gets an invoice, a GST invoice in India.",
      "You own the data your use of Zinwe creates, including activity logs, alerts, chats and tasks. We use it only to provide, maintain and improve the service.",
      "Our total liability for a claim is capped at what you paid us in the 12 months before it. Indian law applies, with the courts in New Delhi. We give at least 30 days' notice of any material change.",
      "Help or a complaint: hello@zinwe.io. Grievance Officer: Vishal Shakaya. We acknowledge within 2 business days and respond with a resolution within 5 business days.",
    ],
    full: "Read the full Terms and Conditions",
  },
  {
    id: "privacy",
    slug: "privacy",
    toc: "Privacy Policy",
    title: "Privacy Policy",
    sum: "What we collect, how we use and share it, how long we keep it, and your rights.",
    points: [
      "Two kinds of data. Account data about your business (name, email, phone, billing, support messages), which we control. Monitored data about your team, which you control and we process for you.",
      "Monitored data is only what you switch on: file transfer events, app use, website names and time on them, internet data used by each app and website, work hours and breaks, email metadata and LAN activity, plus dated consent records.",
      "We never sell personal data or monitored data, and never share it for marketing or advertising. We share it only with cloud hosting, our payment partners (Razorpay and Skydo) and authorities where the law requires.",
      "When you pay online you type your details into Razorpay's window, not Zinwe's. We get only the payment's status, amount and reference, never your card number, UPI PIN or banking password.",
      "Account data is kept while your account is active, plus up to 7 years for legal, tax and accounting reasons. Monitored data is kept while your account is active.",
      "You can ask us to delete monitored data at any time: write to hello@zinwe.io. A setting to choose your own retention period is planned, and this policy will be updated when it is available.",
      "Data is encrypted in transit, and only your chosen administrators can see monitoring logs. If a breach affects your data, we tell you and the authorities as the law requires.",
      "You can ask to see, correct or delete your data (DPDP Act in India; California and similar US state laws). Employees should ask their employer first about monitored data.",
    ],
    updated: "Updated 23 October 2026",
    full: "Read the full Privacy Policy",
  },
  {
    id: "refunds",
    slug: "refund",
    toc: "Refunds",
    title: "Return and Refund Policy",
    sum: "Fees are non-refundable except for billing errors or where the law requires. Stop any time.",
    points: [
      "Fees are final and non-refundable, except as below or where the law requires otherwise. Zinwe is a digital service: paid features switch on as soon as payment is confirmed, so there is nothing to return.",
      "Try the Free forever plan (up to 3 PCs) first to check Zinwe is a fit.",
      "There is nothing to cancel. Plans run one period at a time, a month or a year, and continue only when you pay for the next one. To stop, don't renew, or tell us at hello@zinwe.io and we confirm within 5 business days.",
      "Stopping doesn't refund the period you've paid for: you keep paid features until it ends, then you can move to Free forever. Nothing is auto-charged, and we email a reminder before each paid period ends.",
      "We refund or credit a duplicate or wrong charge from a billing error, a payment we took but couldn't apply to your plan, a confirmed unauthorised transaction, or where Indian or US state consumer law requires it. Ask in writing, soon after the charge.",
      "We reply to a refund request within 5 business days. An approved refund starts within 5 business days and goes back the way you paid. Your bank may take a further 5 to 7 business days to show it.",
    ],
    full: "Read the full Return and Refund Policy",
  },
  {
    id: "cookies",
    slug: "cookies",
    toc: "Cookies",
    title: "Cookie Policy",
    sum: "Essential cookies keep you signed in; optional analytics cookies help us improve the site.",
    points: [
      "Essential cookies make the site and your account work (sign-in, security, load balancing). They can't be switched off.",
      "Analytics cookies run only if you allow them (Accept all, or the Analytics switch in Manage). We use them in aggregate, never to build advertising profiles.",
      "Google Analytics 4 sets _ga and _ga_8ZH4TZ3NTG, kept up to 13 months, with Google signals, advertising features and ad personalisation off.",
      "PostHog sets entries starting with ph_, kept up to a year, with session recording off. If you have an account it knows you only by an internal account number.",
      "Microsoft Clarity shows clicks and scrolling on public pages, with typed text masked. It sets _clck (up to a year) and _clsk (one day), and never runs on the dashboard, sign-in, sign-up, shared quotes or newsletter links.",
      "No advertising or cross-site tracking cookies. We never send your name, email or anything you type into forms.",
      "Change your choice any time with Cookie settings on zinwe.io. Switching analytics off stops measuring straight away and deletes the analytics cookies.",
    ],
    updated: "Updated 17 October 2026",
    full: "Read the full Cookie Policy",
  },
  {
    id: "aup",
    slug: "acceptable-use",
    toc: "Acceptable use",
    title: "Acceptable Use Policy",
    sum: "Zinwe is for monitoring your own business devices, openly. What's allowed and what's not.",
    points: [
      "Allowed: monitoring company-owned or company-managed devices used by your own employees or contractors for business: USB and file transfers, LAN and remote access, approved software and email metadata.",
      "Allowed and expected: clear notice up front and, where required, consent on Zinwe's consent screen before monitoring begins. Only your chosen administrators see the data, and you can ask us to delete what you no longer need.",
      "Not allowed: monitoring a spouse, partner, family member, roommate or anyone outside a genuine, current work relationship, or any personal device you don't own or administer.",
      "Not allowed: hiding monitoring, or monitoring without the notice or consent your law requires.",
      "Not allowed: stalking, harassment, intimidation, domestic abuse or coercive control, or collecting things unrelated to a business purpose, such as personal accounts or personal messages.",
      "Not allowed: reselling or white-labelling Zinwe so someone else can do any of the above.",
      "We may suspend or close an account that breaks this policy, without notice where someone's safety is at risk.",
      "Think Zinwe is being used on you without your knowledge, or to stalk or control you? Write to hello@zinwe.io. SKYTECHNO reads these reports directly, not the account holder.",
    ],
    full: "Read the full Acceptable Use Policy",
  },
];
