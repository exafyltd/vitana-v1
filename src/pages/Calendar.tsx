/**
 * /calendar — the Vitanaland calendar (VTID-04351, step 4 of the redesign).
 *
 * Day, week and month views over GET /api/v1/calendar/events/window: the
 * active role's entries in colour, every other role's as grey busy blocks
 * (time only). Tapping an entry opens it full-screen. Adding things goes
 * through Vitana (voice), which writes through the gateway's producer
 * contract — the screen itself never writes except "mark done".
 *
 * VTID-04915: /calendar/entry/:id opens one entry (reminder notifications
 * link here); members can edit or remove their own entries, and an entry
 * leads back to its community event or live room.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useRole } from "@/hooks/useRole";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate, fmtNumber, formatDate } from "@/lib/locale-format";
import { activateOrb } from "@/lib/orbActivate";
import {
  cancelCalendarEntry,
  completeCalendarEntry,
  fetchCalendarWindow,
  topPillarGain,
  updateCalendarEntry,
  type CalendarEntryPatch,
  moveBlockReasonOf,
  moveCalendarEntry,
  shareCalendarEntryToFeed,
  shareFailureOf,
  type CalendarWindowItem,
  type ShareFailure,
  type ShareToFeedInput,
  type MoveBlockReason,
} from "@/lib/calendar-window-client";

const SHARE_FAILED_KEY: Record<ShareFailure, string> = {
  already_shared: "vcal.share.alreadyShared",
  not_shareable: "vcal.share.notShareable",
  limit: "vcal.share.limit",
  duplicate: "vcal.share.duplicate",
  suspended: "vcal.share.suspended",
  error: "vcal.share.error",
};

const MOVE_BLOCKED_KEY: Record<MoveBlockReason, string> = {
  cancelled: "vcal.move.blocked.cancelled",
  completed: "vcal.move.blocked.completed",
  recurring: "vcal.move.blocked.recurring",
  owned_by_source: "vcal.move.blocked.owned_by_source",
};
import { CALENDAR_NUMBER_STYLE, SURFACE, isDone } from "@/components/calendar/vcal/theme";
import { ViewSwitch, isMilestone } from "@/components/calendar/vcal/parts";
import { DayView, MonthView, WeekView } from "@/components/calendar/vcal/views";
import { EntryScreen } from "@/components/calendar/vcal/EntryScreen";
import { SubscribeSheet, type SubscribeProvider } from "@/components/calendar/vcal/SubscribeSheet";
import { GuideCard } from "@/components/calendar/vcal/GuideCard";
import { AddEntrySheet } from "@/components/calendar/vcal/AddEntrySheet";
import { pickGuidance } from "@/components/calendar/vcal/guidance";
import {
  CalendarsSection,
  ConnectCalendarCard,
  HABIT_REF_TYPE,
  JourneySection,
  RemindersSection,
  WorkSection,
  useCalendarApps,
} from "@/components/calendar/vcal/sections";
import { hhmm, sameDay, stepAnchor, viewRange, type CalendarView } from "@/components/calendar/vcal/time";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INDEX_CARD,
  INDEX_EYEBROW,
  INDEX_HERO_CLASS,
  INDEX_HERO_STYLE,
  INDEX_PRIMARY_BTN,
  INDEX_SOFT_BTN,
} from "@/lib/index-look";

const VIEW_KEY = "vitana.calendar.view";
const GUIDE_DISMISSED_KEY = "vitana.calendar.guide.dismissed";

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readGuideDismissed(): string | null {
  try {
    return localStorage.getItem(GUIDE_DISMISSED_KEY);
  } catch {
    return null;
  }
}

function readSavedView(): CalendarView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "week" || v === "month" ? v : "day";
  } catch {
    return "day";
  }
}

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function CalendarPage() {
  const now = useNow();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [view, setView] = useState<CalendarView>(readSavedView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [openItem, setOpenItem] = useState<CalendarWindowItem | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState<false | { provider?: SubscribeProvider }>(false);
  const [guideDismissed, setGuideDismissed] = useState<string | null>(readGuideDismissed);
  // VTID-04956: the day the add sheet is open for (null = closed). Adding never moves the shown week or month.
  const [addFor, setAddFor] = useState<Date | null>(null);
  // VTID-04915: /calendar/entry/:id — jump to that entry's day, then open it.
  const { entryId } = useParams<{ entryId?: string }>();
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(entryId ?? null);

  const changeView = (v: CalendarView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // per-viewer convenience only
    }
  };

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const query = useQuery({
    queryKey: ["calendar-window", currentRole, range.from.toISOString(), range.to.toISOString()],
    queryFn: () => fetchCalendarWindow(range.from, range.to, currentRole ?? null),
    staleTime: 30_000,
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  useEffect(() => {
    if (!entryId) return;
    setPendingEntryId(entryId);
    let cancelled = false;
    // Read-only: the member's own row (RLS), only to learn which day to show.
    supabase
      .from("calendar_events")
      .select("start_time")
      .eq("id", entryId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.start_time) return;
        setAnchor(new Date(data.start_time));
        setView("day");
      });
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  useEffect(() => {
    if (!pendingEntryId || !query.isSuccess) return;
    const hit = items.find((i) => i.event_id === pendingEntryId && i.event);
    if (hit) {
      setOpenItem(hit);
      setPendingEntryId(null);
    }
  }, [pendingEntryId, query.isSuccess, items]);

  // Today's own numbers, independent of the view (day view shows them).
  const todayQuery = useQuery({
    queryKey: ["calendar-window", currentRole, "today", viewRange("day", now).from.toISOString()],
    queryFn: () => {
      const r = viewRange("day", now);
      return fetchCalendarWindow(r.from, r.to, currentRole ?? null);
    },
    staleTime: 30_000,
  });
  // Work-lens items (deploys, reviews, deadlines) are not the user's own
  // to-dos, so they stay out of the progress ring and "Next up".
  const today = (todayQuery.data?.items ?? []).filter((i) => i.event && !i.work && !isMilestone(i));
  const todayDone = today.filter((i) => isDone(i.event!)).length;

  // VTID-04536: open journey steps — Autopilot steps from the last 30 days
  // up to tonight that are neither done nor cancelled, oldest first.
  const stepsRange = useMemo(() => {
    const to = viewRange("day", now).to;
    return { from: new Date(to.getTime() - 31 * 86_400_000), to };
  }, [now]);
  const stepsQuery = useQuery({
    queryKey: ["calendar-window", currentRole, "journey-steps", stepsRange.to.toISOString()],
    queryFn: () => fetchCalendarWindow(stepsRange.from, stepsRange.to, currentRole ?? null),
    staleTime: 60_000,
  });
  const openSteps = useMemo(
    () =>
      (stepsQuery.data?.items ?? []).filter(
        (i) => i.event && !i.busy && !i.work && i.event.event_type === "autopilot" && i.event.status !== "cancelled" && !isDone(i.event),
      ),
    [stepsQuery.data],
  );
  // VTID-04681: habits the member already put in the calendar (today or tomorrow).
  const habitRange = useMemo(() => {
    const from = viewRange("day", now).from;
    return { from, to: new Date(from.getTime() + 2 * 86_400_000) };
  }, [now]);
  const habitQuery = useQuery({
    queryKey: ["calendar-window", currentRole, "habits", habitRange.from.toISOString()],
    queryFn: () => fetchCalendarWindow(habitRange.from, habitRange.to, currentRole ?? null),
    staleTime: 60_000,
  });
  const addedHabitIds = useMemo(
    () =>
      new Set(
        (habitQuery.data?.items ?? [])
          .filter((i) => i.event?.source_ref_type === HABIT_REF_TYPE && i.event.status !== "cancelled")
          .map((i) => String(i.event!.source_ref_id)),
      ),
    [habitQuery.data],
  );
  const calendarApps = useCalendarApps();
  const guidance = pickGuidance({
    now,
    today,
    openSteps: openSteps.map((i) => ({ id: i.id, title: i.event?.title ?? "" })),
    calendarConnected: calendarApps.connected,
  });
  const navigate = useNavigate();

  const complete = useMutation({
    mutationFn: (item: CalendarWindowItem) => completeCalendarEntry(item.event_id, currentRole ?? null),
    onSuccess: (result) => {
      // VTID-04915: say what it did for the Vitana Index, when it moved.
      const gain = topPillarGain(result?.vitana_index ?? null);
      if (gain) {
        notify("vcal.doneToast", "vcal.indexGain", {
          points: fmtNumber(gain.points, { maximumFractionDigits: 1 }),
          pillar: t(`vcal.kinds.${gain.pillar}`),
        });
      } else {
        notify("vcal.doneToast");
      }
      setOpenItem(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.doneError"),
  });

  // VTID-04374: move one of the member's own entries.
  const move = useMutation({
    mutationFn: ({ item, start }: { item: CalendarWindowItem; start: Date }) =>
      moveCalendarEntry(item.event_id, start, currentRole ?? null),
    onSuccess: () => {
      notify("vcal.move.moved");
      setOpenItem(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: (err) => {
      const reason = moveBlockReasonOf(err);
      notifyError(reason ? MOVE_BLOCKED_KEY[reason] : "vcal.move.error");
    },
  });

  // VTID-04915: edit or remove one of the member's own entries.
  const edit = useMutation({
    mutationFn: ({ item, patch }: { item: CalendarWindowItem; patch: CalendarEntryPatch }) =>
      updateCalendarEntry(item.event_id, patch, currentRole ?? null),
    onSuccess: () => {
      notify("vcal.edit.saved");
      setOpenItem(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.edit.error"),
  });
  const remove = useMutation({
    mutationFn: (item: CalendarWindowItem) => cancelCalendarEntry(item.event_id, currentRole ?? null),
    onSuccess: () => {
      notify("vcal.remove.removed");
      setOpenItem(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.remove.error"),
  });

  // VTID-04916: post the event to the news feed; the entry then links to it.
  const share = useMutation({
    mutationFn: ({ item, input }: { item: CalendarWindowItem; input: ShareToFeedInput }) =>
      shareCalendarEntryToFeed(item.event_id, input, currentRole ?? null),
    onSuccess: (postId, { item }) => {
      notify("vcal.share.done");
      setOpenItem((cur) => (cur && cur.id === item.id ? { ...cur, shared_post_id: postId } : cur));
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: (err, { item }) => {
      const failure = shareFailureOf(err);
      notifyError(SHARE_FAILED_KEY[failure.kind]);
      if (failure.kind === "already_shared" && failure.postId) {
        const postId = failure.postId;
        setOpenItem((cur) => (cur && cur.id === item.id ? { ...cur, shared_post_id: postId } : cur));
      }
    },
  });

  const isTodayAnchor = sameDay(anchor, now);
  const dismissGuide = () => {
    const key = localDayKey(now);
    setGuideDismissed(key);
    try {
      localStorage.setItem(GUIDE_DISMISSED_KEY, key);
    } catch {
      // per-viewer convenience only
    }
  };
  const showGuide =
    view === "day" &&
    isTodayAnchor &&
    query.isSuccess &&
    todayQuery.isSuccess &&
    !!guidance &&
    guidance.kind !== "connect" && // the connect card already says it
    guideDismissed !== localDayKey(now);

  // VTID-04681: one quiet line under the date — how the day looks.
  const dayEntries = items.filter((i) => i.event && !i.work && !isMilestone(i));
  const nextOnDay = dayEntries.find((i) => !isDone(i.event!) && Date.parse(i.start_time) > now.getTime());
  const daySummary =
    dayEntries.length === 0
      ? t("vcal.summary.nothing")
      : [
          dayEntries.length === 1 ? t("vcal.summary.entriesOne") : t("vcal.summary.entries", { count: dayEntries.length }),
          isTodayAnchor && nextOnDay ? t("vcal.summary.next", { time: hhmm(nextOnDay.start_time) }) : null,
          isTodayAnchor && todayDone > 0 ? t("vcal.summary.done", { count: todayDone }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const weekFrom = viewRange("week", anchor).from;
  const weekTo = new Date(weekFrom.getTime() + 6 * 86_400_000);
  const rangeTitle =
    view === "week"
      ? `${fmtDate(weekFrom, { day: "numeric", month: "short" })} – ${fmtDate(weekTo, { day: "numeric", month: "short" })}`
      : formatDate(anchor, "LLLL yyyy");

  // VTID-04852: the hero follows the Vitana Index page — pale blue card, eyebrow, bold title.
  // VTID-04952: one hero for Day, Week and Month; the eyebrow names the view.
  const heroEyebrow = t(`vcal.views.${view}`);

  // VTID-04952: the day number is the one lively element of the Day title.
  const dayTitle = fmtDate(anchor, { weekday: "long", day: "numeric", month: "long" });
  const dayTitleParts = dayTitle.split(/(\d+|[\u0660-\u0669]+)/);

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50/60 px-4 pb-40 pt-4 sm:px-6 sm:pt-6" style={{ color: SURFACE.ink }} data-testid="vcal-page">
        <div className={`mx-auto flex w-full flex-col gap-4 ${view === "week" ? "max-w-6xl" : "max-w-2xl"}`}>
          <header className={INDEX_HERO_CLASS} style={INDEX_HERO_STYLE} data-testid="vcal-header">
            <p className={INDEX_EYEBROW}>{heroEyebrow}</p>
            <h1 className="mt-2 break-words text-center text-2xl font-bold leading-tight text-slate-900" data-testid="vcal-date">
              {view === "day"
                ? dayTitleParts.map((part, i) =>
                    i % 2 === 1 ? (
                      <span key={i} style={CALENDAR_NUMBER_STYLE} data-testid="vcal-day-number">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )
                : rangeTitle}
            </h1>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setAnchor((a) => stepAnchor(view, a, -1))}
                aria-label={t("vcal.prev")}
                className={cn(INDEX_SOFT_BTN, "w-11 px-0")}
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
              </button>
              {!isTodayAnchor && (
                <button type="button" onClick={() => setAnchor(new Date())} className={INDEX_SOFT_BTN}>
                  {t("vcal.today")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnchor((a) => stepAnchor(view, a, 1))}
                aria-label={t("vcal.next")}
                className={cn(INDEX_SOFT_BTN, "w-11 px-0")}
              >
                <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
              </button>
            </div>
          </header>

          <ViewSwitch view={view} onChange={changeView} />

          {/* VTID-04682: connecting a calendar app is right here until one is connected. */}
          {view === "day" && <ConnectCalendarCard onSubscribe={(provider) => setSubscribeOpen({ provider })} />}

          {showGuide && guidance && (
            <GuideCard
              guidance={guidance}
              actions={{
                onStartStep: (id) => setOpenItem(openSteps.find((i) => i.id === id) ?? null),
                onFindEvent: () => navigate("/comm/events-meetups"),
                onAskVitana: () => activateOrb(),
                onShowWeek: () => changeView("week"),
                onConnect: () => document.getElementById("vcal-calendars")?.scrollIntoView({ behavior: "smooth", block: "center" }),
                onDismiss: dismissGuide,
              }}
            />
          )}

          {query.isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label={t("vcal.loading")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-white" />
              ))}
            </div>
          ) : query.isError ? (
            <div className={`${INDEX_CARD} flex flex-col items-center gap-3 py-8 text-center`} role="alert">
              <span className="font-semibold">{t("vcal.error")}</span>
              <button
                type="button"
                onClick={() => query.refetch()}
                className={INDEX_PRIMARY_BTN}
              >
                {t("vcal.retry")}
              </button>
            </div>
          ) : view === "day" ? (
            <DayView key={anchor.toDateString()} items={items} onOpen={setOpenItem} summary={daySummary} />
          ) : view === "week" ? (
            <WeekView key={viewRange("week", anchor).from.toISOString()} anchor={anchor} items={items} now={now} onOpen={setOpenItem} onAdd={setAddFor} />
          ) : (
            <MonthView key={`${anchor.getFullYear()}-${anchor.getMonth()}`} anchor={anchor} items={items} now={now} onOpen={setOpenItem} onAdd={setAddFor} />
          )}

          {/* VTID-04536: folding sections — each closed header says what is inside. */}
          <div className="flex flex-col gap-2 pt-2">
            <JourneySection steps={openSteps} now={now} onOpenStep={setOpenItem} addedHabitIds={addedHabitIds} role={currentRole ?? null} />
            <RemindersSection />
            <WorkSection role={currentRole ?? null} now={now} />
            <div id="vcal-calendars" className="scroll-mt-24">
              <CalendarsSection onShowInApp={(provider) => setSubscribeOpen({ provider })} />
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 px-4 sm:px-6 md:bottom-6">
          <div className={`mx-auto flex ${view === "week" ? "max-w-6xl" : "max-w-2xl"} justify-end`}>
          {/* VTID-04536: add an entry by hand, saved through the gateway. */}
          <button
            type="button"
            onClick={() => setAddFor(anchor)}
            aria-label={t("vcal.add.title")}
            className="pointer-events-auto flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-3xl text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            style={{ background: SURFACE.ink }}
            data-testid="vcal-add"
          >
            <span aria-hidden className="leading-none">+</span>
          </button>
          </div>
        </div>
      </div>

      {openItem?.event && (
        <EntryScreen
          item={openItem}
          now={now}
          onClose={() => {
            setOpenItem(null);
            if (entryId) navigate("/calendar", { replace: true });
          }}
          onComplete={(i) => complete.mutate(i)}
          completing={complete.isPending}
          onMove={(i, start) => move.mutate({ item: i, start })}
          moving={move.isPending}
          onEdit={(i, patch) => edit.mutate({ item: i, patch })}
          saving={edit.isPending}
          onRemove={(i) => remove.mutate(i)}
          removing={remove.isPending}
          onOpenSource={(path) => navigate(path)}
          onShare={(i, input) => share.mutate({ item: i, input })}
          sharing={share.isPending}
        />
      )}
      {subscribeOpen && <SubscribeSheet provider={subscribeOpen.provider} onClose={() => setSubscribeOpen(false)} />}
      {addFor && <AddEntrySheet day={addFor} role={currentRole ?? null} onClose={() => setAddFor(null)} />}
    </AppLayout>
  );
}
