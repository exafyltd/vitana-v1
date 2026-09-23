/**
 * VTID-04385 — show the ticket number when a spoken report becomes a ticket.
 *
 * Vitana (or Devon) says the number out loud; the ORB widget also turns the
 * gateway's `support_ticket_filed` frame into a `vitana:support-ticket-filed`
 * window event. This listener shows it on screen with a link to the ticket,
 * and refreshes the member's ticket list. Mount once inside the Router.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { lookup } from "@/lib/i18n-toast";
import { MY_TICKETS_QUERY_KEY } from "@/lib/feedback-ticket";

export const SUPPORT_TICKET_FILED_EVENT = "vitana:support-ticket-filed";

export interface SupportTicketFiledDetail {
  ticketId?: string | null;
  ticketNumber?: string | null;
  kind?: string | null;
  url?: string | null;
}

/** Only same-app paths are followed; anything else falls back to the list. */
export function ticketLinkFor(detail: SupportTicketFiledDetail): string {
  const url = typeof detail.url === "string" ? detail.url : "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  const id = detail.ticketId ? `?ticket=${encodeURIComponent(detail.ticketId)}` : "";
  return `/comm/talk-to-vitana${id}`;
}

export function SupportTicketFiledListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = ((event as CustomEvent).detail ?? {}) as SupportTicketFiledDetail;
      if (!detail.ticketId && !detail.ticketNumber) return;
      void queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
      const link = ticketLinkFor(detail);
      toast.success(lookup("supportTickets.submittedTitle"), {
        id: `support-ticket-filed:${detail.ticketId ?? detail.ticketNumber}`,
        description: detail.ticketNumber
          ? lookup("supportTickets.submittedNumber", { number: detail.ticketNumber })
          : undefined,
        duration: 12_000,
        action: {
          label: lookup("supportTickets.viewTicket"),
          onClick: () => navigate(link),
        },
      });
    };
    window.addEventListener(SUPPORT_TICKET_FILED_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_TICKET_FILED_EVENT, handler);
  }, [navigate, queryClient]);

  return null;
}

export default SupportTicketFiledListener;
