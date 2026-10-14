/**
 * SKYTECHNO's public contact details and social accounts, from the company document
 * (.cloude/zinwe-doc.docx). One place for the website footer, the Contact page and the dashboard.
 * A social account with an empty `href` is hidden everywhere — fill it in to show it.
 */

export const COMPANY_EMAIL = "hello@zinwe.io";

export type SocialNetwork = "linkedin" | "youtube" | "instagram" | "facebook";

export interface SocialAccount {
  network: SocialNetwork;
  label: string;
  href: string;
}

const SOCIAL_ACCOUNTS: readonly SocialAccount[] = [
  { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/showcase/hello.zinwe/" },
  { network: "youtube", label: "YouTube", href: "https://www.youtube.com/@hellozinwe" },
  { network: "instagram", label: "Instagram", href: "https://www.instagram.com/hello.zinwe/" },
  { network: "facebook", label: "Facebook", href: "https://www.facebook.com/hello.zinwe" },
];

/** The accounts that have a URL, in display order. */
export const SOCIAL_LINKS: readonly SocialAccount[] = SOCIAL_ACCOUNTS.filter((a) => a.href);
