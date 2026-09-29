/**
 * VTID-04335 — the ONE member-facing ticket list.
 *
 * Used by Support → My tickets (mobile + desktop), Talk to Vitana and the
 * Diary report list. Reads GET /api/v1/feedback/tickets/mine (the gateway
 * enforces "only my tickets" with the member's own token), renders the
 * ticket number, one plain-language status vocabulary (TICKET_STATUS_MAP),
 * the answer once resolved, and confirm / reopen.
 *
 * `?ticket=<id or FB-number>` (the deep link the `feedback_ticket_resolved`
 * notification carries) scrolls to and highlights that ticket.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Check, Loader2, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { communityFetch } from "@/lib/community-gateway";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import { cn } from "@/lib/utils";
import {
  MEMBER_TIMELINE,
  matchesTicketRef,
  memberTicketStatus,
  ticketAnswer,
  timelineStep,
  type MemberTicket,
  type MemberTicketStatus,
  MY_TICKETS_QUERY_KEY,
} from "@/lib/feedback-ticket";

const STATUS_TONE: Record<MemberTicketStatus, string> = {
  received: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  under_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  fixed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  wont_fix: "bg-muted text-muted-foreground border-border",
  duplicate: "bg-muted text-muted-foreground border-border",
};

const KNOWN_KINDS = new Set(["feedback", "bug", "ux_issue", "support_question", "account_issue", "marketplace_claim", "feature_request"]);

function kindLabel(kind: string): string {
  return t(`supportTickets.kind.${KNOWN_KINDS.has(kind) ? kind : "other"}`);
}

function capitalize(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

interface MyTicketsListProps {
  /** Only show these kinds (e.g. the Diary shows bug / ux_issue only). */
  kinds?: string[];
  /** How many to show before "show more". */
  pageSize?: number;
  /** Override the ?ticket= query param (tests, embedding). */
  highlightTicket?: string | null;
  /** Bumping this refetches (callers that just submitted a ticket). */
  refreshKey?: number;
  /** Hide the heading (when the host screen already has one). */
  hideHeading?: boolean;
  headingKey?: string;
  className?: string;
}

export function MyTicketsList({
  kinds,
  pageSize = 10,
  highlightTicket,
  refreshKey,
  hideHeading,
  headingKey = "supportTickets.title",
  className,
}: MyTicketsListProps) {
  const [searchParams] = useSearchParams();
  const highlight = highlightTicket !== undefined ? highlightTicket : searchParams.get("ticket");
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(pageSize);
  const [busyId, setBusyId] = useState<string | null>(null);
  const scrolledFor = useRef<string | null>(null);

  const ticketsQuery = useQuery<MemberTicket[]>({
    queryKey: MY_TICKETS_QUERY_KEY,
    queryFn: async () => {
      const res = await communityFetch("/api/v1/feedback/tickets/mine?limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.tickets ?? []) as MemberTicket[];
    },
    // Voice-captured tickets (ORB report_to_specialist) and status changes
    // show up without a manual refresh.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (refreshKey !== undefined) queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
  }, [refreshKey, queryClient]);

  const tickets = useMemo(() => {
    const all = ticketsQuery.data ?? [];
    return kinds ? all.filter((tk) => kinds.includes(tk.kind)) : all;
  }, [ticketsQuery.data, kinds]);

  // A deep-linked ticket beyond the first page must still be visible.
  const highlightIndex = tickets.findIndex((tk) => matchesTicketRef(tk, highlight));
  const shown = tickets.slice(0, Math.max(visible, highlightIndex + 1));

  useEffect(() => {
    if (highlightIndex < 0 || !highlight || scrolledFor.current === highlight) return;
    const el = document.getElementById(`ticket-${tickets[highlightIndex].id}`);
    if (el) {
      scrolledFor.current = highlight;
      el.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }
  }, [highlight, highlightIndex, tickets]);

  const act = async (ticket: MemberTicket, action: "confirm" | "reopen") => {
    setBusyId(ticket.id);
    try {
      const res = await communityFetch(`/api/v1/feedback/tickets/${ticket.id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
      if (action === "confirm") notify("toasts.community.thanks", "toasts.community.weLlKeepEyeIt");
      else notify("toasts.community.reopened", "toasts.community.vitanaWillFollowUp");
    } catch {
      notifyError(action === "confirm" ? "toasts.community.couldnTConfirm" : "toasts.community.couldnTReopen");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={cn("space-y-2", className)} aria-labelledby={hideHeading ? undefined : "my-tickets-heading"}>
      {!hideHeading && (
        <h2 id="my-tickets-heading" className="text-sm font-semibold">
          {t(headingKey)}
          {tickets.length > 0 && <span className="ms-1 text-muted-foreground">({tickets.length})</span>}
        </h2>
      )}

      {ticketsQuery.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("supportTickets.loading")}
        </p>
      )}
      {ticketsQuery.error && !ticketsQuery.data && (
        <div className="flex items-center gap-3 text-sm text-destructive">
          <span>{t("supportTickets.loadError")}</span>
          <Button size="sm" variant="outline" onClick={() => ticketsQuery.refetch()}>
            {t("supportTickets.retry")}
          </Button>
        </div>
      )}
      {ticketsQuery.data && tickets.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t("supportTickets.empty")}</p>
          <p className="mt-1">{t("supportTickets.emptyHint")}</p>
        </Card>
      )}

      {shown.map((ticket) => {
        const status = memberTicketStatus(ticket.status);
        const step = timelineStep(status);
        const answer = ticketAnswer(ticket);
        const awaitingConfirm = ticket.status === "resolved";
        const isHighlighted = matchesTicketRef(ticket, highlight);
        const severity = ticket.structured_fields?.severity;
        return (
          <Card
            key={ticket.id}
            id={`ticket-${ticket.id}`}
            data-testid="member-ticket"
            data-highlighted={isHighlighted ? "true" : undefined}
            className={cn(
              "flex flex-col gap-2 p-3 transition-shadow",
              isHighlighted && "ring-2 ring-primary shadow-md",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-semibold" dir="ltr">{ticket.ticket_number}</span>
              <Badge variant="outline" className={cn("text-[11px]", STATUS_TONE[status])}>
                {t(`supportTickets.status.${status}`)}
              </Badge>
              {ticket.structured_fields?.voice_origin && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Mic className="h-3 w-3" />
                  {t("supportTickets.viaVoice")}
                </Badge>
              )}
              {severity && (
                <Badge variant="outline" className="text-[10px]">
                  {t(`supportTickets.severity.${severity}`)}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {kindLabel(ticket.kind)} · {t("supportTickets.reportedOn", { date: fmtDate(ticket.created_at, { dateStyle: "medium" }) })}
              {ticket.resolver_agent && <> · {t("supportTickets.handledBy", { name: capitalize(ticket.resolver_agent) })}</>}
            </div>

            {ticket.raw_transcript && (
              <p className="line-clamp-2 text-sm" dir="auto">{ticket.raw_transcript}</p>
            )}

            {step >= 0 && (
              <ol className="flex items-center gap-1" aria-label={t("supportTickets.timelineLabel")}>
                {MEMBER_TIMELINE.map((s, i) => (
                  <li key={s} className="flex min-w-0 flex-1 flex-col gap-1" aria-current={i === step ? "step" : undefined}>
                    <span className={cn("h-1.5 rounded-full", i <= step ? (status === "fixed" ? "bg-emerald-500" : "bg-primary") : "bg-muted")} />
                    <span className={cn("truncate text-[10px]", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {t(`supportTickets.status.${s}`)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {answer && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm" data-testid="ticket-answer">
                <div className="mb-1 text-xs font-medium text-muted-foreground">{t("supportTickets.ourAnswer")}</div>
                <p className="whitespace-pre-wrap break-words" dir="auto">{answer}</p>
              </div>
            )}

            {ticket.status === "user_confirmed" && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                {t("supportTickets.confirmed")}
              </span>
            )}

            {awaitingConfirm && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                <div className="mb-2 font-medium">
                  {ticket.resolver_agent
                    ? t("supportTickets.didItWorkNamed", { name: capitalize(ticket.resolver_agent) })
                    : t("supportTickets.didItWork")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busyId === ticket.id} onClick={() => act(ticket, "confirm")}>
                    {t("supportTickets.yesFixed")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === ticket.id} onClick={() => act(ticket, "reopen")}>
                    {t("supportTickets.noStillBroken")}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {tickets.length > shown.length && (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + pageSize)}>
            {t("supportTickets.showMore", { count: tickets.length - shown.length })}
          </Button>
        </div>
      )}
    </section>
  );
}

export default MyTicketsList;
