/**
 * One floating chat bubble for messaging a team member (opened from an alert's
 * "Send alert" menu, and anywhere else that wants it). AppLayout hosts it;
 * callers use `useChatBubble().open(...)`.
 */
import { createContext, useContext } from "react";
import type { DeviceEvent } from "../../lib/api";
import type { ComposerPerson, Delivery } from "../components/TaggedComposer";
import type { Urgency } from "./messageTags";

export interface ChatBubbleRequest {
  person: ComposerPerson & { hostname?: string };
  /** The alert it's about, if any (adds context and alert tags; "Email only" becomes the alert email). */
  event?: DeviceEvent | null;
  tag?: string | null;
  /** A ready-made note to start from (e.g. "please agree on your PC"); the owner can edit it. */
  draft?: string;
  urgency?: Urgency;
  delivery?: Delivery;
  /** Called after each send, e.g. to mark an alert row "Sent". */
  onSent?: (delivery: Delivery) => void;
}

export interface ChatBubbleApi {
  open: (request: ChatBubbleRequest) => void;
}

export const ChatBubbleContext = createContext<ChatBubbleApi>({ open: () => undefined });

export function useChatBubble(): ChatBubbleApi {
  return useContext(ChatBubbleContext);
}
