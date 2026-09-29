/**
 * /calendar — the Vitanaland calendar (VTID-04351, step 4 of the redesign).
 *
 * Day, week and month views over GET /api/v1/calendar/events/window: the
 * active role's entries in colour, every other role's as grey busy blocks
 * (time only). Tapping an entry opens it full-screen. Adding things goes
 * through Vitana (voice), which writes through the gateway's producer
 * contract — the screen itself never writes except "mark done".
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useRole } from "@/hooks/useRole";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate, formatDate } from "@/lib/locale-format";
import { activateOrb } from "@/lib/orbActivate";
import {
  completeCalendarEntry,
  fetchCalendarWindow,
  moveBlockReasonOf,
  moveCalendarEntry,
  type CalendarWindowItem,
  type MoveBlockReason,
} from "@/lib/calendar-window-client";

const MOVE_BLOCKED_KEY: Record<MoveBlockReason, string> = {
  cancelled: "vcal.move.blocked.cancelled",
  completed: "vcal.move.blocked.completed",
  recurring: "vcal.move.blocked.recurring",
  owned_by_source: "vcal.move.blocked.owned_by_source",
};
import { SURFACE, isDone } from "@/components/calendar/vcal/theme";
import { ViewSwitch, isMilestone } from "@/components/calendar/vcal/parts";
import { HEADING_FONT } from "@/components/calendar/vcal/labels";
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

const VIEW_KEY = "vitana.calendar.view";
const FONTS_ID = "vcal-fonts";
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500&display=swap";
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

/** Load the calendar's two typefaces once, only when the calendar is opened. */
function useCalendarFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_ID;
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);
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
  useCalendarFonts();
  const now = useNow();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [view, setView] = useState<CalendarView>(readSavedView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [openItem, setOpenItem] = useState<CalendarWindowItem | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState<false | { provider?: SubscribeProvider }>(false);
  const [guideDismissed, setGuideDismissed] = useState<string | null>(readGuideDismissed);
  const [addOpen, setAddOpen] = useState(false);

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
  const items = query.data?.items ?? [];

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
  const nextUp = today.find((i) => !isDone(i.event!) && Date.parse(i.start_time) > now.getTime()) ?? null;

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
    onSuccess: () => {
      notify("vcal.doneToast");
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
  void nextUp;

  const weekFrom = viewRange("week", anchor).from;
  const weekTo = new Date(weekFrom.getTime() + 6 * 86_400_000);
  const rangeTitle =
    view === "week"
      ? `${fmtDate(weekFrom, { day: "numeric", month: "short" })} – ${fmtDate(weekTo, { day: "numeric", month: "short" })}`
      : formatDate(anchor, "LLLL yyyy");

  const pickDay = (d: Date) => {
    setAnchor(d);
    changeView("day");
  };

  const navBtn = "flex h-10 w-10 items-center justify-center rounded-full text-xl";

  return (
    <AppLayout>
      <div
        className="min-h-full pb-40"
        style={{ background: SURFACE.page, color: SURFACE.ink, fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 400 }}
        data-testid="vcal-page"
      >
        <div className={`mx-auto flex w-full flex-col gap-4 px-4 pt-5 ${view === "week" ? "max-w-6xl" : "max-w-2xl"}`}>
          {/* VTID-04681: the date comes first, large. */}
          <header className="flex items-start justify-between gap-3" data-testid="vcal-header">
            {view === "day" ? (
              <div className="flex min-w-0 items-end gap-3" data-testid="vcal-date">
                <span className="text-[64px] font-medium leading-[0.85] tabular-nums" style={{ fontFamily: HEADING_FONT }}>
                  {formatDate(anchor, "d")}
                </span>
                <span className="flex min-w-0 flex-col pb-0.5">
                  <span className="truncate text-[22px] font-medium leading-tight">{formatDate(anchor, "EEEE")}</span>
                  <span className="truncate text-[15px]" style={{ color: SURFACE.muted }}>
                    {isTodayAnchor ? `${t("vcal.today")} · ${formatDate(anchor, "LLLL yyyy")}` : formatDate(anchor, "LLLL yyyy")}
                  </span>
                </span>
              </div>
            ) : (
              <h1 className="m-0 min-w-0 break-words text-[28px] font-medium leading-tight" style={{ fontFamily: HEADING_FONT }}>
                {rangeTitle}
              </h1>
            )}
            <div className="flex shrink-0 items-center gap-0.5 pt-1">
              <button type="button" onClick={() => setAnchor((a) => stepAnchor(view, a, -1))} aria-label={t("vcal.prev")} className={navBtn}>
                <span className="rtl:rotate-180">‹</span>
              </button>
              {!isTodayAnchor && (
                <button
                  type="button"
                  onClick={() => setAnchor(new Date())}
                  className="h-9 rounded-full px-3 text-sm"
                  style={{ border: `1px solid ${SURFACE.line}`, background: "#FFFFFF" }}
                >
                  {t("vcal.today")}
                </button>
              )}
              <button type="button" onClick={() => setAnchor((a) => stepAnchor(view, a, 1))} aria-label={t("vcal.next")} className={navBtn}>
                <span className="rtl:rotate-180">›</span>
              </button>
            </div>
          </header>

          {view === "day" && query.isSuccess && (
            <p className="-mt-2 m-0 text-[15px]" style={{ color: SURFACE.muted }} data-testid="vcal-summary">
              {daySummary}
            </p>
          )}

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
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center" role="alert" style={{ border: `1px solid ${SURFACE.line}` }}>
              <span className="font-medium">{t("vcal.error")}</span>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="h-10 rounded-full px-5 font-medium text-white"
                style={{ background: SURFACE.primary }}
              >
                {t("vcal.retry")}
              </button>
            </div>
          ) : view === "day" ? (
            <DayView key={anchor.toDateString()} items={items} onOpen={setOpenItem} />
          ) : view === "week" ? (
            <WeekView anchor={anchor} items={items} now={now} onOpen={setOpenItem} onPickDay={pickDay} />
          ) : (
            <MonthView anchor={anchor} items={items} now={now} onPickDay={pickDay} />
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

        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center gap-2 px-4 md:bottom-6">
          <button
            type="button"
            onClick={() => activateOrb()}
            className="flex h-[52px] min-w-0 max-w-md flex-1 items-center gap-3 rounded-full bg-white ps-5 pe-1.5 text-start shadow-lg"
            data-testid="vcal-voice-add"
          >
            <span className="flex-1 truncate text-[15px]" style={{ color: SURFACE.muted }}>
              {t("vcal.voiceAdd")}
            </span>
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white" style={{ background: "#C22F66" }}>
              🎙️
            </span>
          </button>
          {/* VTID-04536: add an entry by hand, saved through the gateway. */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label={t("vcal.add.title")}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-3xl text-white shadow-lg"
            style={{ background: SURFACE.ink }}
            data-testid="vcal-add"
          >
            <span aria-hidden className="leading-none">+</span>
          </button>
        </div>
      </div>

      {openItem?.event && (
        <EntryScreen
          item={openItem}
          now={now}
          onClose={() => setOpenItem(null)}
          onComplete={(i) => complete.mutate(i)}
          completing={complete.isPending}
          onMove={(i, start) => move.mutate({ item: i, start })}
          moving={move.isPending}
        />
      )}
      {subscribeOpen && <SubscribeSheet provider={subscribeOpen.provider} onClose={() => setSubscribeOpen(false)} />}
      {addOpen && <AddEntrySheet day={anchor} role={currentRole ?? null} onClose={() => setAddOpen(false)} />}
    </AppLayout>
  );
}
