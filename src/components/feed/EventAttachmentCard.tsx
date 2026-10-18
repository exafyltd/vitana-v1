/**
 * VTID-04916 — the event a feed post shares, as a live card under the
 * member's words: title, when, where, and whether it is still on. The button
 * goes to the event itself (where joining and tickets live) or to the live
 * room, so "I'm in too" always takes the same path as anywhere else in the
 * app. A cancelled or finished event says so instead of inviting anyone.
 *
 * VTID-05126 — a shared own entry (`calendar_entry`) renders from the card on
 * the post (title, time, place only if the author showed it, status); its
 * button adds a copy to the viewer's own calendar ("In meinen Kalender").
 * The author sees no button on their own post.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CalendarPlus, Radio } from "lucide-react";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { addSharedEntryToCalendar, CalendarApiError } from "@/lib/calendar-window-client";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import { cn } from "@/lib/utils";
import {
  fetchAttachedEvent,
  snapshotAttachedEvent,
  type AttachedEventState,
  type PostAttachedRef,
} from "@/lib/post-attachment";

const STATE_KEY: Record<AttachedEventState, string> = {
  upcoming: "vcal.feedCard.upcoming",
  live: "vcal.feedCard.live",
  past: "vcal.feedCard.past",
  cancelled: "vcal.feedCard.cancelled",
};

export function EventAttachmentCard({
  attached,
  postId,
  isOwnPost = false,
}: {
  attached: PostAttachedRef;
  /** VTID-05126: the post carrying the card ("In meinen Kalender"). */
  postId?: string;
  /** VTID-05126: the viewer wrote this post — no "add to my calendar" on it. */
  isOwnPost?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEntry = attached.type === "calendar_entry";
  const live = useQuery({
    queryKey: ["post-attached-event", attached.type, attached.id],
    queryFn: () => fetchAttachedEvent(attached),
    staleTime: 60_000,
    enabled: !isEntry,
  });
  const ev = isEntry ? (attached.snapshot ? snapshotAttachedEvent(attached.snapshot) : null) : live.data;
  const isLoading = !isEntry && live.isLoading;
  const isRoom = attached.type === "live_room_session";
  const Icon = isRoom ? Radio : CalendarDays;

  const add = useMutation({
    mutationFn: () => addSharedEntryToCalendar(postId!),
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
      notify(action === "already" ? "vcal.feedCard.alreadyAdded" : "vcal.feedCard.added");
    },
    onError: (err) =>
      notifyError(err instanceof CalendarApiError && err.message === "NOT_OPEN" ? "vcal.feedCard.notOpen" : "vcal.feedCard.addError"),
  });

  if (isLoading) {
    return (
      <div
        // design-allow-next-line: no scale value within 2px of 76px
        className="mt-3 h-[76px] animate-pulse rounded-xl bg-muted"
        data-testid="feed-event-card-loading"
      />
    );
  }
  if (!ev) {
    return (
      <div
        className="mt-3 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground"
        data-testid="feed-event-card-gone"
      >
        {t("vcal.feedCard.unavailable")}
      </div>
    );
  }
  const open = ev.state === "upcoming" || ev.state === "live";
  const canAdd = isEntry && open && !!postId && !isOwnPost;
  const action = !open || isEntry
    ? null
    : isRoom
      ? ev.state === "live"
        ? t("vcal.feedCard.joinRoom")
        : t("vcal.feedCard.openRoom")
      : t("vcal.feedCard.openEvent");

  return (
    <div
      className={cn(
        "mt-3 flex flex-col gap-2.5 rounded-xl border border-border px-3 py-2.5",
        !open && "opacity-70",
      )}
      data-testid="feed-event-card"
      data-state={ev.state}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {isEntry && attached.snapshot?.emoji ? (
            <span className="text-xl" aria-hidden>
              {attached.snapshot.emoji}
            </span>
          ) : (
            <Icon className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">
            {ev.title || t("vcal.feedCard.untitled")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {fmtDate(ev.start_time, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}{" "}
            · {fmtTime(ev.start_time, { hour: "2-digit", minute: "2-digit" })}
            {ev.location ? ` · ${ev.location}` : ""}
          </p>
          <span
            className={cn(
              "mt-0.5 inline-block text-xs font-medium",
              ev.state === "live"
                ? "text-status-error"
                : ev.state === "cancelled"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {t(STATE_KEY[ev.state])}
          </span>
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(ev.path);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-10 w-full rounded-full bg-primary px-4 text-sm font-semibold sm:w-auto sm:self-end text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="feed-event-card-open"
        >
          {action}
        </button>
      )}
      {canAdd && (
        <button
          type="button"
          disabled={add.isPending}
          onClick={(e) => {
            e.stopPropagation();
            add.mutate();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto sm:self-end focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="feed-event-card-add"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {t("vcal.feedCard.addToCalendar")}
        </button>
      )}
    </div>
  );
}
