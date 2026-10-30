/**
 * Zinwe's legal texts, from the founder's document (.cloude/zinwe-doc.docx, 14 Oct 2026), with the
 * plans and billing corrected to the live product on 15 Oct 2026.
 * One source for the website's /legal pages, the sign-up and payment checkboxes, the cookie
 * banner and the dashboard's Policies page. When the Terms change, bump LEGAL_VERSION here and
 * ZINWE_LEGAL_VERSION in the backend settings: new acceptances record the new version, and every
 * owner on an older version is asked once to accept again (dashboard UpdatedTermsDialog).
 * The cookie banner (COOKIE_POLICY_VERSION) and the widget's monitoring consent
 * (ConsentStore.CurrentVersion) have their own versions — bump those only when their texts change.
 */

// 2026-10-23: online payment through Razorpay (billing, refund timelines, delivery, grievances), the Teams plan,
// and monthly or yearly billing (the same day: owners who accepted today's earlier text aren't asked again).
export const LEGAL_VERSION = "2026-10-23";
export const LEGAL_UPDATED = "23 October 2026";
// 2026-10-17: names the analytics tools (Google Analytics 4, PostHog, Microsoft Clarity), so everyone chooses again, informed.
export const COOKIE_POLICY_VERSION = "2026-10-17";
export const LEGAL_CONTACT = "hello@zinwe.io";
/** Razorpay's own terms and privacy policy, which cover online payments (linked, never copied: they change). */
export const RAZORPAY_TERMS_URL = "https://razorpay.com/terms/";
export const RAZORPAY_PRIVACY_URL = "https://razorpay.com/privacy-policy/";

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  slug: LegalSlug;
  title: string;
  /** One line for the index page and links. */
  summary: string;
  sections: LegalSection[];
  /** "Last updated" when this document changed after LEGAL_UPDATED (e.g. the Cookie Policy alone). */
  updated?: string;
}

export type LegalSlug = "terms" | "privacy" | "refund" | "delivery" | "cookies" | "acceptable-use" | "disclaimer";

const TERMS: LegalDoc = {
  slug: "terms",
  title: "Terms and Conditions",
  summary: "The agreement for using Zinwe: who it's for, lawful use on company PCs, your responsibilities, plans priced per PC, billing with no auto-charge and liability.",
  sections: [
    {
      heading: "Acceptance & What Zinwe Is",
      blocks: [
        'By creating an account or using Zinwe ("the Service"), you agree to these Terms and Conditions. Zinwe is operated by SKYTECHNO, a proprietorship based in New Delhi, India ("Zinwe," "we," "us"). If you don\'t agree, don\'t use the Service. If you\'re signing up on behalf of a business, you confirm you have authority to bind that business.',
        "Zinwe provides small and medium businesses with software for data loss prevention and employee activity monitoring — including file transfer/USB control, LAN activity, remote access, software installation control, and email attachment alerts (never email content) — along with centralized administrative logs and alerts.",
        "These Terms apply to customers in India, the United States, and elsewhere, with jurisdiction-specific points called out below where the law differs.",
      ],
    },
    {
      heading: "Permitted Use & Your Responsibilities",
      blocks: [
        "The Service is for lawful monitoring of devices and personnel you are authorized to monitor — your own employees or contractors, on company-owned or company-managed devices. You may not use Zinwe to monitor personal devices you don't own or control, to monitor a spouse, family member, or anyone outside a genuine employer–employee relationship, or to facilitate stalking, harassment, or unlawful surveillance. We may suspend or terminate accounts we reasonably believe violate this.",
        "You are responsible for complying with the law that applies to your monitoring:",
        {
          list: [
            "India — under the Digital Personal Data Protection Act, 2023 (DPDP Act), a generic monitoring clause in an offer letter is not valid consent. Use Zinwe's built-in consent screen to capture free, specific, informed, and affirmative consent from each monitored employee before enabling monitoring.",
            "United States — federal law (ECPA, 1986) generally permits monitoring of company-owned devices for a business purpose, but a growing number of states — including Connecticut, Delaware, New York, and Colorado — require written notice to employees before monitoring begins, and California's AB 1221 adds requirements for screenshot and content-capture monitoring. Check your state's requirements and give notice before turning monitoring on.",
          ],
        },
        "Zinwe's consent and transparency features assist your compliance; they don't guarantee it. You remain responsible for your own legal review.",
      ],
    },
    {
      heading: "Accounts, Subscriptions & Billing",
      blocks: [
        "You're responsible for keeping your login credentials confidential and for all activity under your account. Tell us promptly about any unauthorized use.",
        "Zinwe is priced flat by the number of PCs you protect — not per seat. Plans currently are: Free forever (up to 3 PCs), Startups (up to 10 PCs, ₹971 a month: 28% off the ₹1,349 list price), Teams (up to 25 PCs, ₹1,799 a month: 28% off the ₹2,499 list price) and Businesses (up to 50 PCs, ₹2,834 a month: 30% off the ₹4,049 list price), with custom pricing above 50 PCs. What each plan includes is on our pricing page. These are monthly prices in Indian rupees; paying for a year at once costs less, and customers outside India pay the US-dollar prices, all on our pricing page. Discounts are offered at our discretion and may end with notice; you keep the price you signed up at until we tell you otherwise. Current plans and prices are on our pricing page and may change with notice; continued use after a change means you accept the new price for future billing cycles.",
        "You choose to be billed monthly or yearly, each time you pay. Customers in India are billed in Indian rupees, with GST added at the applicable rate. International customers are billed in US dollars, without Indian GST (an export of services). The currency follows the country on your company profile; your renewal follows the billing period you last paid for.",
        "You can pay online through our payment partner Razorpay Software Private Limited — UPI apps, cards, netbanking or wallets in India, and cards from abroad — and your plan is activated as soon as Razorpay confirms the payment. You can also pay by bank transfer (India) or by card or US bank transfer through our payment partner Skydo (outside India) and send us the receipt in your dashboard; we activate or renew your plan once we've confirmed it, usually within one working day. Every payment gets an invoice (a GST invoice in India).",
        "Each payment is a one-off payment for one billing period: nothing is charged automatically, and we never see or store your card number, UPI PIN or banking password. Online payments are handled by Razorpay under its own Terms of Use (razorpay.com/terms) and Privacy Policy (razorpay.com/privacy-policy). We'll email a reminder before your paid period ends; if you don't renew, the plan expires at the end of the paid period and you can move to the Free forever plan or renew at any time.",
      ],
    },
    {
      heading: "License, Data Ownership & Confidentiality",
      blocks: [
        "We grant you a limited, non-exclusive, non-transferable license to use Zinwe for your internal business purposes. You may not reverse-engineer, resell, white-label, or use the Service to build a competing product.",
        'As between us, you own all data your use of Zinwe generates ("Customer Data"), including activity logs and alerts. We don\'t claim ownership of it and use it only to provide, maintain, and improve the Service, as described in our Privacy Policy. The Zinwe name, logo, and underlying software are owned by SKYTECHNO. Each party will protect the other\'s confidential information with reasonable care.',
      ],
    },
    {
      heading: "Termination, Liability & Governing Law",
      blocks: [
        "Either party may terminate as described in our Return and Refund Policy. We may suspend or terminate your access immediately for breach of the Permitted Use section or a material breach of these Terms. Sections that by nature should survive termination (data ownership, IP, confidentiality, liability, governing law) continue to apply.",
        'The Service is provided "as is"; see our Disclaimer, which is part of these Terms. To the extent the law allows, SKYTECHNO isn\'t liable for indirect, incidental, or consequential damages, and our total liability for any claim is capped at what you paid us in the 12 months before the claim. These limits don\'t apply to breaches of confidentiality, gross negligence, or willful misconduct by either party, or to the indemnification obligations below.',
        "These Terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts in New Delhi. If you're a customer in the United States, nothing here limits any non-waivable consumer protection rights you have under the law of your home state. We'll give at least 30 days' notice of any material change to these Terms that affects your rights or pricing, by email or in-product notice; continued use after that notice period means you accept the change.",
      ],
    },
    {
      heading: "Customer Support & Grievances",
      blocks: [
        "For help, billing questions or a complaint, write to hello@zinwe.io or use the form at zinwe.io/contact. Our Grievance Officer is Vishal Shakaya, SKYTECHNO, New Delhi, India (hello@zinwe.io). We acknowledge every complaint within 2 business days and respond with a resolution within 5 business days of receiving it.",
        "For a problem with an online payment itself (for example, money taken but no plan update), write to us first; we'll check it with Razorpay and fix it or refund it as set out in our Return and Refund Policy.",
      ],
    },
    {
      heading: "Indemnification & General Provisions",
      blocks: [
        "You agree to indemnify and hold SKYTECHNO harmless from claims, damages, and costs (including reasonable legal fees) arising from your breach of the Permitted Use section, your failure to obtain required notice or consent for monitoring, or your violation of applicable law in how you use the Service.",
        "Neither party is liable for delay or failure to perform caused by circumstances beyond reasonable control (force majeure). You may not assign these Terms without our written consent; we may assign them in connection with a merger, acquisition, or sale of the business. If any provision of these Terms is found unenforceable, the rest remain in effect. These Terms, together with our Privacy Policy, Return and Refund Policy, Shipping and Delivery Policy, Cookie Policy, Disclaimer, and Acceptable Use Policy, are the entire agreement between us.",
      ],
    },
  ],
};

const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  summary: "What Zinwe collects about your business and your team, how we use and share it, how long we keep it, how we protect it, and your rights in India and the US.",
  // v1.1: names website time and internet data used (the PC's consent notice asks members again).
  // 2026-10-23: names the payment partners (Razorpay, Skydo).
  updated: "23 October 2026",
  sections: [
    {
      heading: "What We Collect",
      blocks: [
        'This policy explains how SKYTECHNO ("we," "us"), which operates Zinwe, handles information. There are two kinds of data:',
        {
          list: [
            "Customer Account Data — information about the business that registers for Zinwe: name, business name, email, phone, billing details, and support communications. We're the data controller/fiduciary for this.",
            "Monitored User Data — activity data about your employees, collected through monitoring features you configure: file transfer events, application usage, website names and time spent on them, how much internet data each app and website uses, work hours and breaks, email metadata, and LAN activity, limited to what you've enabled, plus timestamped consent records. Here, you (the Customer) are the controller/fiduciary; we're the data processor providing the technical infrastructure. If an employee wants to exercise a data right, direct them to you, their employer — not us.",
          ],
        },
        "From our website, we also collect standard technical data (IP address, browser type, pages visited) via cookies — see our Cookie Policy.",
      ],
    },
    {
      heading: "How We Use & Share Information",
      blocks: [
        "We use data to provide, operate, bill for, and improve the Service, to give support, to meet legal obligations, and — in aggregate, anonymized form — to understand product usage. We do not sell personal data or Monitored User Data, and we don't share it with anyone for marketing or advertising.",
        "We share data only with: cloud hosting providers (to run the Service), payment partners (for billing), and law enforcement or regulators where legally required.",
        "Our payment partners are Razorpay (online payments: UPI, cards, netbanking, wallets) and Skydo (international card and bank transfers). When you pay online, you enter your payment details in Razorpay's secure window, not on Zinwe: Razorpay processes them under its own Privacy Policy (razorpay.com/privacy-policy), and we receive only the payment's status, amount and reference — never your card number, UPI PIN or banking password.",
        "Legal basis: for India-based processing, your Account Data is processed under the DPDP Act's provisions for performing our contract with you; the Service is built to help you establish valid consent for Monitored User Data under the Act (our built-in consent screen). For US customers, our processing of your Account Data rests on performing our contract with you and our legitimate business interest in running the Service; your own legal basis for monitoring your employees (consent, notice, or another basis recognized by your state) is your responsibility, as described in our Terms. Enterprise customers needing a separate Data Processing Agreement can request one from us.",
      ],
    },
    {
      heading: "Retention & Security",
      blocks: [
        "Customer Account Data is kept while your account is active, plus up to 7 years after for legal, tax, and accounting purposes. Monitored User Data is kept while your account is active. You can ask us to delete it at any time by writing to hello@zinwe.io. A setting to choose your own retention period is planned; this policy will be updated when it is available.",
        "We use encryption in transit, role-based access controls on monitoring logs, and access limited to your designated administrators. No system can guarantee absolute security. If a data breach affecting your personal data occurs, we'll notify you and the relevant authorities as required under the DPDP Act or applicable US state law.",
      ],
    },
    {
      heading: "Your Rights — India & United States",
      blocks: [
        "India — under the DPDP Act, you may have rights to access, correct, or erase your personal data, and to withdraw consent where consent is the basis for processing. Contact our Grievance Officer (below) for Account Data requests.",
        'United States — if you\'re a California resident, you may have the right to know what personal information we hold about you, request its deletion or correction, and opt out of the "sale" or "sharing" of personal information. We don\'t sell or share personal information for cross-context behavioral advertising, so there\'s nothing to opt out of there. We won\'t discriminate against you — for example, by denying service or charging a different price — for exercising any of these rights. Residents of other states with similar privacy laws have equivalent rights. To exercise any of these, contact us using the details below; Monitored User Data requests should generally go to your employer first, since they control what\'s monitored.',
      ],
    },
    {
      heading: "Children, International Transfers & Changes",
      blocks: [
        "Zinwe is a business product. We don't knowingly collect personal data from anyone under 18 through account registration, and the Service isn't meant to monitor individuals under 18 outside a lawful employment relationship.",
        "Data may be processed on servers in India or other countries as needed to run the Service. If you're outside India, you're responsible for ensuring your use of the Service has an appropriate legal basis and, where required, a valid cross-border transfer mechanism under your own law.",
        'We may update this policy; we\'ll note material changes via the Service or email, and the "last updated" date above reflects the latest revision.',
        "Grievance Officer / Contact: Vishal Shakaya · hello@zinwe.io · SKYTECHNO, New Delhi, India.",
      ],
    },
  ],
};

const REFUND: LegalDoc = {
  slug: "refund",
  title: "Return and Refund Policy",
  summary: "Zinwe fees are non-refundable except for billing errors or where the law requires. Nothing is charged automatically, so you can stop at the end of any period.",
  sections: [
    {
      heading: "Policy Summary",
      blocks: [
        "Subscription fees for Zinwe are final and non-refundable, except as set out below or where the law requires otherwise. Zinwe is a digital service — access to paid features is granted as soon as payment is confirmed, so there's nothing physical to return.",
        "Before paying, try Zinwe on the Free forever plan (up to 3 PCs) to confirm it's a fit.",
      ],
    },
    {
      heading: "Cancellations & Billing",
      blocks: [
        "There's nothing to cancel: paid plans run one billing period at a time (a month or a year, as you chose) and only continue when you pay for the next one. To stop, simply don't renew, or tell us at hello@zinwe.io and we'll confirm it within 5 business days. Stopping doesn't refund the period you've already paid for — you keep paid features until it ends; after that, the plan expires and you can move to the Free forever plan.",
        "You pay online through Razorpay (UPI apps, cards, netbanking or wallets; cards from abroad), or by bank transfer (India) or through Skydo (outside India) and send the receipt in your dashboard. Every payment is a one-off: nothing is auto-charged to a stored card. We'll email a renewal reminder before each paid period ends.",
      ],
    },
    {
      heading: "Exceptions & Contact",
      blocks: [
        "We may issue a refund or credit for: a duplicate or erroneous charge caused by a billing error (for example, paying twice for the same period), a payment we took but couldn't apply to your plan, a confirmed unauthorized transaction on your payment method, or where mandated by applicable consumer protection law — including Indian consumer protection law and the consumer protection laws of your US state. Submit requests in writing, within a reasonable time of the charge, to the contact below.",
        "Refund timelines: we reply to a refund request within 5 business days. An approved refund is started within 5 business days of approval and goes back the way you paid — to your card, UPI or bank account for online payments through Razorpay, or to the account you paid from for a bank transfer or Skydo payment. Your bank may take a further 5 to 7 business days to show it.",
        "Billing questions: hello@zinwe.io · SKYTECHNO, New Delhi, India.",
      ],
    },
  ],
};

const DELIVERY: LegalDoc = {
  slug: "delivery",
  title: "Shipping and Delivery Policy",
  summary: "Zinwe is software delivered online, so nothing is shipped. Online payments start your plan in about a minute; bank transfers usually in one working day.",
  sections: [
    {
      heading: "Nothing Is Shipped",
      blocks: [
        "Zinwe is software delivered online. We don't sell or ship physical goods, so there are no shipping charges, couriers or delivery addresses.",
      ],
    },
    {
      heading: "When Your Plan Starts",
      blocks: [
        {
          list: [
            "Paid online through Razorpay: your plan is active as soon as the payment is confirmed, usually within a minute. You'll see it in your dashboard and get the invoice by email.",
            "Paid by bank transfer or through Skydo: your plan is active once we've confirmed the payment, usually within one working day, and we'll email you when it is.",
            "Free forever plan: active as soon as you sign up.",
          ],
        },
        "The Zinwe app for your PCs is downloaded from your dashboard; you can install it on as many PCs as your plan covers.",
      ],
    },
    {
      heading: "If Something Doesn't Arrive",
      blocks: [
        "If you've paid and your plan hasn't switched on within the times above, or the invoice email hasn't arrived, write to hello@zinwe.io with your payment reference. We respond within 5 business days, and usually much sooner.",
      ],
    },
  ],
};

const DISCLAIMER: LegalDoc = {
  slug: "disclaimer",
  title: "Disclaimer",
  summary: "Zinwe is provided as is. It helps you spot data leaks but can't catch every incident, and its alerts and consent screens aren't legal or professional advice.",
  sections: [
    {
      heading: '"As Is" Service, No Guarantee of Detection',
      blocks: [
        'Zinwe is provided "as is" and "as available," without warranties of any kind except where the law doesn\'t allow us to exclude them. While Zinwe is designed to help detect and prevent data leaks and unauthorized activity, no monitoring software can guarantee it will catch every incident, threat, or vulnerability. We don\'t promise the Service will be error-free or uninterrupted.',
      ],
    },
    {
      heading: "Not Legal, Security, or Professional Advice",
      blocks: [
        "Nothing in Zinwe — including its consent-capture screens, purpose-limitation controls, or compliance-support features — is legal advice, and using them doesn't guarantee you're compliant with the DPDP Act, US state monitoring-notice laws, or any other law. The same goes for plain-language alerts and recommended actions: they're meant to help you understand activity on your systems, not to replace professional legal, security, or HR advice for your specific situation.",
      ],
    },
    {
      heading: "Your Responsibility & Liability",
      blocks: [
        "You're solely responsible for how you configure and use Zinwe — what you monitor, what notice you give, and what consent you obtain. We're not responsible for your failure to use the Service lawfully, including any failure to give required notice or consent.",
        "The Service may link to or integrate with third-party tools (e.g., Google Workspace, Microsoft 365, once available); we're not responsible for their content, security, or availability. This Disclaimer should be read together with the Limitation of Liability section of our Terms and Conditions.",
      ],
    },
  ],
};

const COOKIES: LegalDoc = {
  slug: "cookies",
  title: "Cookie Policy",
  summary: "Essential cookies keep you signed in to Zinwe. Analytics cookies (Google Analytics, PostHog, Clarity) run only if you allow them. Change your choice any time.",
  updated: "17 October 2026",
  sections: [
    {
      heading: "Cookies We Use",
      blocks: [
        "Our website (zinwe.io) uses cookies and similar technologies to make the site work and to understand how it's used:",
        {
          list: [
            "Essential cookies — needed for the site and your account to function (login sessions, security, load balancing). These can't be switched off.",
            "Analytics cookies — only if you allow them (\"Accept all\", or the Analytics switch in \"Manage\"). They help us see which pages are useful and how visitors find and move through the site, so we can improve it. We use these in aggregate; they aren't used to build advertising profiles.",
          ],
        },
        "For analytics we use three tools, all only with your OK. Google Analytics 4 (Google LLC) shows us how visitors find and use the website; it sets the cookies _ga and _ga_8ZH4TZ3NTG, kept for up to 13 months, with Google signals, advertising features and ad personalisation switched off. PostHog (PostHog Inc.) shows us which steps of sign-up and setup work and where people get stuck; it sets a cookie and a browser-storage entry whose names start with ph_, kept for up to a year, with session recording switched off, and if you have an account it knows you only by an internal account number, never by your name or email. Microsoft Clarity (Microsoft Corporation) shows us how visitors use our public pages — where they click and scroll — as heatmaps and session replays, with the text you type masked; it sets the cookies _clck (up to a year) and _clsk (one day). Clarity never runs on your dashboard, sign-in and sign-up pages, shared quotes or newsletter links. These providers process this data on our behalf and may do so outside India. We never send your name, email address or anything you type into forms, and private links (such as a shared quote) are shortened before anything is measured.",
        "We don't currently use third-party advertising or cross-site tracking cookies.",
      ],
    },
    {
      heading: "Managing Cookies",
      blocks: [
        "Most browsers let you block or delete cookies through their settings. Blocking essential cookies may stop parts of the site or your account from working correctly; blocking analytics cookies won't affect your ability to use Zinwe.",
        'You can change your choice on this site at any time with "Cookie settings" in the footer. If you switch analytics off, we stop measuring straight away and delete the analytics cookies from your browser.',
      ],
    },
    {
      heading: "India, United States & Changes",
      blocks: [
        "India — cookies that collect personal data are governed by our Privacy Policy and the DPDP Act, 2023.",
        'United States — if you\'re a California resident: we don\'t sell or share information collected via cookies for cross-context behavioral advertising, so there\'s no "sale" to opt out of. Where applicable state law requires a cookie preference mechanism, we\'ll provide one on the site.',
        'We may update this policy as our use of cookies changes; the "last updated" date above reflects the latest revision. Questions: hello@zinwe.io',
      ],
    },
  ],
};

const ACCEPTABLE_USE: LegalDoc = {
  slug: "acceptable-use",
  title: "Acceptable Use Policy",
  summary: "Zinwe is for protecting your own business PCs, openly and with each person's knowledge. What's allowed, what's not, and how to report misuse to us directly.",
  sections: [
    {
      heading: "Purpose & Who Zinwe Is For",
      blocks: [
        "Zinwe is built for businesses to protect company data and understand activity on devices and networks they own or manage, with the knowledge of the people being monitored. This Acceptable Use Policy sets out exactly what that means in practice, and what it rules out. It applies to every customer, in India, the United States, and elsewhere, alongside our Terms and Conditions.",
        "Zinwe is not intended, marketed, or licensed for monitoring anyone outside a genuine, current employer–employee or business–contractor relationship, on a device the business owns or manages.",
      ],
    },
    {
      heading: "Permitted Use",
      blocks: [
        "You may use Zinwe to:",
        {
          list: [
            "Monitor company-owned or company-managed devices used by your own employees or contractors for business purposes",
            "Control USB and file-transfer activity, track LAN and remote-access activity, manage approved software, and review email metadata on those devices",
            "Give the people you monitor clear, upfront notice and, where required, capture their consent through Zinwe's built-in consent screen before monitoring begins",
            "Set access permissions so only designated administrators see monitoring data, and ask us to delete monitoring data you no longer need",
          ],
        },
      ],
    },
    {
      heading: "Prohibited Use",
      blocks: [
        "You may not use Zinwe, and we will suspend or terminate any account we reasonably believe is using Zinwe, to:",
        {
          list: [
            "Monitor a spouse, partner, family member, roommate, or anyone outside a genuine, current employment or contractor relationship",
            "Monitor any personal device you don't own or have authorized administrative control over",
            "Conceal monitoring from the people it applies to, or monitor without the notice or consent your jurisdiction requires",
            "Facilitate stalking, harassment, intimidation, or any form of domestic abuse or coercive control",
            "Collect or access content unrelated to a legitimate business purpose, such as personal accounts, personal messages, or data outside company systems",
            "Resell, white-label, or provide access to Zinwe in a way that enables a third party to do any of the above",
          ],
        },
        "We treat suspected violations of this section as grounds for immediate suspension, and will cooperate with law enforcement where required by law.",
      ],
    },
    {
      heading: "Transparency & Consent Requirements",
      blocks: [
        "India — under the Digital Personal Data Protection Act, 2023, a blanket clause in an offer letter is not valid consent. Use Zinwe's consent screen to capture free, specific, informed, and affirmative consent from each monitored employee before enabling monitoring on their device.",
        "United States — federal law (ECPA, 1986) permits monitoring of company-owned devices for a business purpose, but Connecticut, Delaware, New York, and Colorado require written notice before monitoring begins, and California's AB 1221 adds specific requirements for screenshot and content-capture monitoring. Give notice that meets your state's requirements before turning monitoring on; Zinwe's features assist this, but compliance is your responsibility.",
      ],
    },
    {
      heading: "Enforcement & Reporting",
      blocks: [
        "We may investigate, suspend, or terminate any account that appears to violate this policy, without notice where we reasonably believe someone's safety is at risk. This is in addition to, not instead of, the termination rights in our Terms and Conditions.",
        "If you believe Zinwe is being used to monitor you without your knowledge or consent, or to stalk, harass, or control you, contact us at hello@zinwe.io — reports are reviewed directly by SKYTECHNO, not by the account holder you're reporting.",
      ],
    },
  ],
};

/** Every policy, in the order the website lists them. */
export const LEGAL_DOCS: readonly LegalDoc[] = [TERMS, PRIVACY, REFUND, DELIVERY, COOKIES, ACCEPTABLE_USE, DISCLAIMER];

export function legalDoc(slug: string | undefined): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

/** What the sign-up checkbox accepts. */
export const SIGNUP_DOCS: readonly LegalDoc[] = [TERMS, PRIVACY, ACCEPTABLE_USE];

/** What the payment checkbox accepts: the billing terms, the refund policy and when the plan starts. */
export const PAYMENT_TERMS: LegalDoc = {
  slug: "refund",
  title: "Payment terms",
  summary: "How billing works and when refunds apply.",
  sections: [
    TERMS.sections.find((s) => s.heading === "Accounts, Subscriptions & Billing")!,
    ...REFUND.sections,
    DELIVERY.sections.find((s) => s.heading === "When Your Plan Starts")!,
  ],
};
