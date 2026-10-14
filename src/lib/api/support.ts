/** Customer support: the dashboard's floating Support chat (answered by the Zinwe team in the admin app). */
import { authedRequest } from "./http";

export type SupportCategory = "question" | "problem" | "billing" | "setup" | "idea";
export type SupportStatus = "open" | "answered" | "closed";

export interface SupportMessage {
  id: number;
  sender: "owner" | "staff";
  author_name: string;
  body: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  page: string;
  created_at: string;
  updated_at: string;
  /** Replies from the team you haven't opened yet. */
  unread: number;
  last_message: { sender: "owner" | "staff"; body: string; created_at: string } | null;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
}

export interface OpenTicketPayload {
  /** Optional: left out, the backend titles the conversation from the message's first line. */
  subject?: string;
  category: SupportCategory;
  message: string;
  page?: string;
}

export type OpenTicketField = "subject" | "category" | "message";

/** GET support/tickets/ — your conversations, newest first. */
export function listSupportTickets(signal?: AbortSignal): Promise<SupportTicket[]> {
  return authedRequest<SupportTicket[]>("/api/support/tickets/", { signal });
}

/** POST support/tickets/ — the Zinwe team is emailed. */
export function openSupportTicket(payload: OpenTicketPayload): Promise<SupportTicketDetail> {
  return authedRequest<SupportTicketDetail>("/api/support/tickets/", { method: "POST", body: payload });
}

/** GET support/tickets/<id>/ — the conversation; marks the team's replies read. */
export function getSupportTicket(id: number, signal?: AbortSignal): Promise<SupportTicketDetail> {
  return authedRequest<SupportTicketDetail>(`/api/support/tickets/${id}/`, { signal });
}

/** POST support/tickets/<id>/messages/ — add a message (reopens a closed conversation). */
export function replySupportTicket(id: number, body: string): Promise<SupportMessage> {
  return authedRequest<SupportMessage>(`/api/support/tickets/${id}/messages/`, { method: "POST", body: { body } });
}
