/** The website's contact form: POST /api/contact/ emails the Zinwe team and a "we got it" note to the visitor. */
import { postPublic, type SubmitResult } from "./http";

export interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  topic?: string;
  message: string;
}

export type ContactField = keyof ContactPayload;

const CONTACT_FIELDS: readonly ContactField[] = ["name", "email", "company", "phone", "topic", "message"];

/** 201 `{status: "sent"}`; 400 field errors; 429 when the throttle (10 an hour) is hit. */
export function submitContact(payload: ContactPayload): Promise<SubmitResult<{ status: string }, ContactField>> {
  return postPublic<{ status: string }, ContactField>("/api/contact/", payload, CONTACT_FIELDS);
}
