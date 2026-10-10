/**
 * VTID-04917 — a calendar invite in a chat (direct or group).
 *
 * The card is what the gateway built from the sender's own calendar entry:
 * a community event, a live room session, or the sender's own plan. The
 * person invited answers here:
 *   - "I'm in": a free event is joined (it lands in their calendar); a paid
 *     or full event and a live room open their own page, where tickets and
 *     joining live; an own plan is copied into their calendar;
 *   - "Maybe" is recorded; "No" is recorded (and removes a copied plan).
 * The sender sees how many said yes and maybe. A finished event invites
 * nobody.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Radio, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import {
  CalendarApiError,
  fetchInviteState,
  respondToCalendarInvite,
  type CalendarInviteCard as Invite,
  type InviteAction,
  type InviteResponse,
} from "@/lib/calendar-window-client";

const RESPONSES: InviteResponse[] = ["accepted", "maybe", "declined"];

const DONE_KEY: Partial<Record<InviteAction, string>> = {
  joined: "vcal.inviteCard.joined",
  added: "vcal.inviteCard.added",
  removed: "vcal.inviteCard.removed",
  recorded: "vcal.inviteCard.recorded",
};

export const inviteStateKey = (messageId: string) => ["calendar-invite", messageId] as const;

export function inviteIsOver(invite: Invite, now: Date = new Date()): boolean {
  const start = Date.parse(invite.start_time);
  const end = invite.end_time ? Date.parse(invite.end_time) : start + 60 * 60_000;
  return Number.isFinite(end) && end <= now.getTime();
}

interface Props {
  messageId: string;
  invite: Invite;
  isOwnMessage: boolean;
}

export function CalendarInviteCard({ messageId, invite, isOwnMessage }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const over = inviteIsOver(invite);
  const state = useQuery({
    queryKey: inviteStateKey(messageId),
    queryFn: () => fetchInviteState(messageId),
    staleTime: 30_000,
    retry: false,
  });

  const answer = useMutation({
    mutationFn: (response: InviteResponse) => respondToCalendarInvite(messageId, response),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: inviteStateKey(messageId) });
      if (result.action === "joined" || result.action === "added") {
        queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
      }
      if ((result.action === "open_event" || result.action === "open_room") && result.path) {
        notify(result.action === "open_event" ? "vcal.inviteCard.openEvent" : "vcal.inviteCard.openRoom");
        navigate(result.path);
        return;
      }
      const key = DONE_KEY[result.action];
      if (key) notify(key);
    },
    onError: (err) =>
      notifyError(err instanceof CalendarApiError && err.message === "EVENT_NOT_OPEN" ? "vcal.inviteCard.notOpen" : "vcal.inviteCard.error"),
  });

  const Icon = invite.ref_type === "live_room_session" ? Radio : CalendarDays;
  const mine = state.data?.my_response ?? null;
  const counts = state.data?.counts;
  const canAnswer = !isOwnMessage && !over && state.data?.is_sender !== true;

  return (
    <Card className="max-w-sm border-primary/20" data-testid="calendar-invite-card" data-ref-type={invite.ref_type}>
      <CardContent className="flex flex-col gap-3 p-4">
        <Badge variant="secondary" className="flex w-fit items-center gap-1">
          <Icon className="h-3 w-3" aria-hidden />
          {t(`vcal.inviteCard.kind.${invite.ref_type}`)}
        </Badge>
        <div className="flex flex-col gap-1">
          <h4 className="m-0 break-words text-base font-semibold">{invite.title || t("vcal.feedCard.untitled")}</h4>
          <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {fmtDate(invite.start_time, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
              {fmtTime(invite.start_time, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
          {invite.location && (
            <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="break-words">{invite.location}</span>
            </p>
          )}
        </div>

        {over && (
          <p className="m-0 text-sm font-medium text-muted-foreground" data-testid="calendar-invite-over">
            {t("vcal.feedCard.past")}
          </p>
        )}

        {counts && (counts.accepted > 0 || counts.maybe > 0) && (
          <p className="m-0 flex items-center gap-2 text-xs text-muted-foreground" data-testid="calendar-invite-counts">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {t("vcal.inviteCard.counts", { yes: counts.accepted, maybe: counts.maybe })}
          </p>
        )}

        {canAnswer && (
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("vcal.inviteCard.answer")}>
            {RESPONSES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={mine === r}
                disabled={answer.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  answer.mutate(r);
                }}
                className={cn(
                  "min-h-10 rounded-full px-2 text-sm font-medium transition-colors disabled:opacity-60",
                  mine === r ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
                )}
                data-testid={`calendar-invite-${r}`}
              >
                {t(`vcal.inviteCard.${r}`)}
              </button>
            ))}
          </div>
        )}

        {!canAnswer && !over && mine === null && isOwnMessage && !counts?.accepted && !counts?.maybe && (
          <p className="m-0 text-xs text-muted-foreground" data-testid="calendar-invite-waiting">
            {t("vcal.inviteCard.waiting")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
