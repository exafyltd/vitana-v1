/**
 * VTID-04916 — the event a feed post shares, as a live card under the
 * member's words: title, when, where, and whether it is still on. The button
 * goes to the event itself (where joining and tickets live) or to the live
 * room, so "I'm in too" always takes the same path as anywhere else in the
 * app. A cancelled or finished event says so instead of inviting anyone.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Radio } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import { cn } from "@/lib/utils";
import {
  fetchAttachedEvent,
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
}: {
  attached: PostAttachedRef;
}) {
  const navigate = useNavigate();
  const { data: ev, isLoading } = useQuery({
    queryKey: ["post-attached-event", attached.type, attached.id],
    queryFn: () => fetchAttachedEvent(attached),
    staleTime: 60_000,
  });
  const isRoom = attached.type === "live_room_session";
  const Icon = isRoom ? Radio : CalendarDays;

  if (isLoading) {
    return (
      <div
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
  const action = !open
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
          <Icon className="h-5 w-5" aria-hidden />
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
                ? "text-red-600"
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
    </div>
  );
}
