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
import AppLayout from "@/components/AppLayout";
import { useRole } from "@/hooks/useRole";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate, formatDate } from "@/lib/locale-format";
import { activateOrb } from "@/lib/orbActivate";
import {
  completeCalendarEntry,
  fetchCalendarWindow,
  type CalendarWindowItem,
} from "@/lib/calendar-window-client";
import { SURFACE, isDone } from "@/components/calendar/vcal/theme";
import { DayProgress, NextUpCard, ViewSwitch } from "@/components/calendar/vcal/parts";
import { HEADING_FONT } from "@/components/calendar/vcal/labels";
import { DayView, MonthView, WeekView } from "@/components/calendar/vcal/views";
import { EntryScreen } from "@/components/calendar/vcal/EntryScreen";
import { SubscribeSheet } from "@/components/calendar/vcal/SubscribeSheet";
import { greetingKey, sameDay, stepAnchor, viewRange, type CalendarView } from "@/components/calendar/vcal/time";

const VIEW_KEY = "vitana.calendar.view";
const FONTS_ID = "vcal-fonts";
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&display=swap";

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
  const [subscribeOpen, setSubscribeOpen] = useState(false);

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
  const today = (todayQuery.data?.items ?? []).filter((i) => i.event && !i.work);
  const todayDone = today.filter((i) => isDone(i.event!)).length;
  const nextUp = today.find((i) => !isDone(i.event!) && Date.parse(i.start_time) > now.getTime()) ?? null;

  const complete = useMutation({
    mutationFn: (item: CalendarWindowItem) => completeCalendarEntry(item.event_id, currentRole ?? null),
    onSuccess: () => {
      notify("vcal.doneToast");
      setOpenItem(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.doneError"),
  });

  const isTodayAnchor = sameDay(anchor, now);
  const title =
    view === "day"
      ? isTodayAnchor
        ? t(greetingKey(now))
        : fmtDate(anchor, { weekday: "long", day: "numeric", month: "long" })
      : view === "week"
        ? t("vcal.week.title", { date: fmtDate(viewRange("week", anchor).from, { day: "numeric", month: "short" }) })
        : formatDate(anchor, "LLLL yyyy");

  const pickDay = (d: Date) => {
    setAnchor(d);
    changeView("day");
  };

  return (
    <AppLayout>
      <div
        className="min-h-full pb-28"
        style={{ background: SURFACE.page, color: SURFACE.ink, fontFamily: "Nunito, system-ui, sans-serif" }}
        data-testid="vcal-page"
      >
        <div className={`mx-auto flex w-full flex-col gap-3.5 px-4 pt-5 ${view === "week" ? "max-w-6xl" : "max-w-2xl"}`}>
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-bold" style={{ color: SURFACE.muted }}>
                {fmtDate(now, { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <h1 className="m-0 break-words text-[26px] font-bold leading-tight sm:text-[28px]" style={{ fontFamily: HEADING_FONT }}>
                {title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSubscribeOpen(true)}
                aria-label={t("vcal.subscribe.title")}
                title={t("vcal.subscribe.title")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm"
                data-testid="vcal-subscribe-open"
              >
                <span aria-hidden>📲</span>
              </button>
              <button
                type="button"
                onClick={() => setAnchor((a) => stepAnchor(view, a, -1))}
                aria-label={t("vcal.prev")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-sm"
              >
                <span className="rtl:rotate-180">‹</span>
              </button>
              {!isTodayAnchor && (
                <button type="button" onClick={() => setAnchor(new Date())} className="h-10 rounded-full bg-white px-3.5 text-sm font-extrabold shadow-sm">
                  {t("vcal.today")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnchor((a) => stepAnchor(view, a, 1))}
                aria-label={t("vcal.next")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-sm"
              >
                <span className="rtl:rotate-180">›</span>
              </button>
            </div>
          </div>

          <ViewSwitch view={view} onChange={changeView} />

          {view === "day" && isTodayAnchor && today.length > 0 && <DayProgress done={todayDone} total={today.length} />}
          {view === "day" && isTodayAnchor && nextUp && <NextUpCard item={nextUp} now={now} onOpen={setOpenItem} />}

          {query.isLoading ? (
            <div className="flex flex-col gap-2.5" aria-busy="true" aria-label={t("vcal.loading")}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[18px] bg-white" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-10 text-center" role="alert">
              <span aria-hidden className="text-4xl">
                😕
              </span>
              <span className="font-extrabold">{t("vcal.error")}</span>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="h-11 rounded-full px-5 font-extrabold text-white"
                style={{ background: SURFACE.primary }}
              >
                {t("vcal.retry")}
              </button>
            </div>
          ) : view === "day" ? (
            <DayView items={items} onOpen={setOpenItem} />
          ) : view === "week" ? (
            <WeekView anchor={anchor} items={items} now={now} onOpen={setOpenItem} onPickDay={pickDay} />
          ) : (
            <MonthView anchor={anchor} items={items} now={now} onPickDay={pickDay} />
          )}
        </div>

        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
          <button
            type="button"
            onClick={() => activateOrb()}
            className="flex h-[52px] w-full max-w-md items-center gap-3 rounded-full bg-white ps-5 pe-1.5 text-start shadow-lg"
            data-testid="vcal-voice-add"
          >
            <span className="flex-1 truncate text-[15px]" style={{ color: SURFACE.muted }}>
              {t("vcal.voiceAdd")}
            </span>
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white" style={{ background: "#C22F66" }}>
              🎙️
            </span>
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
        />
      )}
      {subscribeOpen && <SubscribeSheet onClose={() => setSubscribeOpen(false)} />}
    </AppLayout>
  );
}
