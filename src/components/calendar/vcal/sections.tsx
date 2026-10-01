/**
 * The calendar's folding sections (VTID-04536): your journey, your
 * reminders, and the calendars you have connected. Each closed header says
 * what is inside; nothing here duplicates a screen that already exists —
 * reminders are the Reminders panel, calendar apps are Connected Apps.
 *
 * VTID-04681: Vitana's plan never fills the calendar by itself. Habits live
 * here, in Journey, and each one can be put in the calendar with one tap.
 * Staff work is one folded line, never entries.
 *
 * VTID-04682: connecting Google, Apple or Outlook is a card near the top of
 * the day while nothing is connected. An app whose sign-in is set up on this
 * stack hands off to Connected Apps (two-way); until then the same button
 * adds Vitana to that app by subscription link, which works everywhere.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { useReminders } from "@/hooks/useReminders";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useGoalPlan, type GoalPlanStep } from "@/hooks/useGoalPlan";
import { useTranslation } from "@/hooks/useTranslation";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import { createCalendarEntry, fetchCalendarWindow, type CalendarWindowItem } from "@/lib/calendar-window-client";
import { fetchConnectedApps, type ConnectedAppId, type ConnectedAppState } from "@/lib/connected-apps-client";
import { CONNECTED_APPS_QUERY_KEY } from "@/components/settings/connected-apps/MailCalendarContactsPanel";
import { Disclosure } from "./Disclosure";
import { itemEmoji } from "./labels";
import { SURFACE } from "./theme";
import { sameDay, viewRange } from "./time";
import type { SubscribeProvider } from "./SubscribeSheet";
import { CalendarProviderLogo } from "./ProviderLogos";

// ---------------------------------------------------------------- journey

/** RRULE UNTIL (UTC, the form the gateway accepts) for the end of a local date. */
export function untilEndOf(dateIso: string): string {
  const [y, m, d] = dateIso.slice(0, 10).split("-").map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59);
  return end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** First start at hh:mm: today if that time is still ahead, else tomorrow. */
export function firstStart(now: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (s.getTime() <= now.getTime()) s.setDate(s.getDate() + 1);
  return s;
}

export const HABIT_REF_TYPE = "goal_plan_habit";

function HabitRow({
  habit,
  targetDate,
  added,
  now,
  role,
}: {
  habit: GoalPlanStep;
  targetDate: string;
  added: boolean;
  now: Date;
  role: string | null;
}) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [time, setTime] = useState("08:00");
  const add = useMutation({
    mutationFn: () => {
      const start = firstStart(now, time);
      return createCalendarEntry(
        {
          title: habit.title,
          start_time: start.toISOString(),
          end_time: new Date(start.getTime() + 15 * 60_000).toISOString(),
          event_type: "wellness_nudge",
          emoji: "🌱",
          rrule: `FREQ=DAILY;UNTIL=${untilEndOf(targetDate)}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          source_ref_type: HABIT_REF_TYPE,
          source_ref_id: habit.id,
        },
        role,
      );
    },
    onSuccess: () => {
      notify("vcal.journey.habitAdded");
      setPicking(false);
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.add.error"),
  });

  return (
    <li className="flex flex-col gap-2 border-t py-2.5 first:border-t-0" style={{ borderColor: SURFACE.line }} data-testid="vcal-habit">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-[15px]">{habit.title}</span>
        {added ? (
          <span className="shrink-0 text-sm" style={{ color: SURFACE.muted }} data-testid="vcal-habit-added">
            ✓ {t("vcal.journey.inCalendar")}
          </span>
        ) : (
          !picking && (
            <button type="button" onClick={() => setPicking(true)} className="shrink-0 text-sm" style={{ color: SURFACE.primary }} data-testid="vcal-habit-add">
              {t("vcal.journey.addHabit")}
            </button>
          )
        )}
      </div>
      {picking && !added && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm" style={{ color: SURFACE.muted }} htmlFor={`habit-time-${habit.id}`}>
            {t("vcal.journey.dailyAt")}
          </label>
          <input
            id={`habit-time-${habit.id}`}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value || "08:00")}
            className="h-9 rounded-xl bg-white px-2 text-sm"
            style={{ border: `1px solid ${SURFACE.line}` }}
            data-testid="vcal-habit-time"
          />
          <button
            type="button"
            disabled={add.isPending}
            onClick={() => add.mutate()}
            className="h-9 rounded-full px-4 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: SURFACE.primary }}
            data-testid="vcal-habit-confirm"
          >
            {t("vcal.journey.addConfirm")}
          </button>
          <button type="button" onClick={() => setPicking(false)} className="h-9 px-2 text-sm" style={{ color: SURFACE.muted }}>
            {t("vcal.form.cancel")}
          </button>
        </div>
      )}
    </li>
  );
}

export function JourneySection({
  steps,
  now,
  onOpenStep,
  addedHabitIds,
  role,
}: {
  steps: CalendarWindowItem[];
  now: Date;
  onOpenStep: (i: CalendarWindowItem) => void;
  addedHabitIds: Set<string>;
  role: string | null;
}) {
  const progress = useJourneyProgress();
  const plan = useGoalPlan().data?.plan ?? null;
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const habits = plan?.status === "active" ? plan.habits : [];
  if (!progress && steps.length === 0 && habits.length === 0) return null;

  const wave = progress ? translate(progress.wave.nameKey, progress.wave.name) : null;
  const bits = [
    habits.length ? (habits.length === 1 ? t("vcal.journey.habitsOne") : t("vcal.journey.habits", { count: habits.length })) : null,
    steps.length ? (steps.length === 1 ? t("vcal.journey.openOne") : t("vcal.journey.open", { count: steps.length })) : null,
  ].filter(Boolean);
  const summary = bits.length ? bits.join(" · ") : wave ? `${wave} · ${t("vcal.journey.day", { day: progress!.dayNumber })}` : "";

  return (
    <Disclosure id="journey" title={t("vcal.journey.title")} summary={summary}>
      {progress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm" style={{ color: SURFACE.muted }}>
            <span>{wave}</span>
            <span>{t("vcal.journey.dayOf", { day: progress.dayNumber, total: 90 })}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: SURFACE.track }}>
            <div className="h-full rounded-full" style={{ width: `${progress.waveProgress}%`, background: "#C99A2E" }} />
          </div>
        </div>
      )}
      {habits.length > 0 && plan && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px]" style={{ color: SURFACE.muted }}>
            {t("vcal.journey.habitsTitle")}
          </span>
          <ul className="m-0 flex list-none flex-col p-0">
            {habits.map((h) => (
              <HabitRow key={h.id} habit={h} targetDate={plan.target_date} added={addedHabitIds.has(h.id)} now={now} role={role} />
            ))}
          </ul>
        </div>
      )}
      {steps.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {steps.slice(0, 5).map((s) => {
            const start = new Date(s.start_time);
            return (
              <li key={s.id} className="border-t first:border-t-0" style={{ borderColor: SURFACE.line }}>
                <button type="button" onClick={() => onOpenStep(s)} className="flex w-full items-center gap-3 py-2.5 text-start" data-testid="vcal-journey-step">
                  <span aria-hidden>{itemEmoji(s)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px]">{s.event?.title}</span>
                    <span className="text-xs" style={{ color: SURFACE.muted }}>
                      {sameDay(start, now) ? t("vcal.journey.today", { time: fmtTime(start, { hour: "2-digit", minute: "2-digit" }) }) : fmtDate(start, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm" style={{ color: SURFACE.primary }}>
                    {t("vcal.guide.start")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {steps.length > 5 ? (
          <span className="text-sm" style={{ color: SURFACE.muted }}>
            {t("vcal.journey.more", { count: steps.length - 5 })}
          </span>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => navigate("/autopilot")} className="text-sm" style={{ color: SURFACE.primary }}>
          {t("vcal.journey.openJourney")} →
        </button>
      </div>
    </Disclosure>
  );
}

// ---------------------------------------------------------------- reminders

export function RemindersSection() {
  const { data: list = [], isLoading } = useReminders({ include_fired: true });
  const upcoming = list
    .filter((r) => r.status === "pending" || r.status === "dispatching")
    .sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at));
  const next = upcoming[0];
  const summary = isLoading
    ? t("vcal.loading")
    : upcoming.length === 0
      ? t("vcal.remindersSection.none")
      : `${upcoming.length === 1 ? t("vcal.remindersSection.upcomingOne") : t("vcal.remindersSection.upcoming", { count: upcoming.length })} · ${t("vcal.remindersSection.next", {
          when: fmtDate(new Date(next.next_fire_at), { weekday: "short", hour: "2-digit", minute: "2-digit" }),
        })}`;
  return (
    <Disclosure id="reminders" title={t("vcal.remindersSection.title")} summary={summary}>
      <RemindersPanel embedded />
    </Disclosure>
  );
}

// ---------------------------------------------------------------- staff work

const STAFF_ROLES = new Set(["admin", "staff", "backoffice", "developer", "dev", "infra", "super_admin"]);

/**
 * VTID-04681: work that waits for this staff member (reviews, ticket
 * deadlines, approvals) as one folded line. Never entries in the calendar.
 * Shown only when something is waiting.
 */
export function WorkSection({ role, now }: { role: string | null; now: Date }) {
  const navigate = useNavigate();
  const staff = !!role && STAFF_ROLES.has(role);
  const r = viewRange("day", now);
  const q = useQuery({
    queryKey: ["calendar-window", role, "work", r.from.toISOString()],
    queryFn: () => fetchCalendarWindow(r.from, r.to, role, { includeWork: true }),
    enabled: staff,
    staleTime: 60_000,
  });
  const work = (q.data?.items ?? []).filter((i) => i.work);
  if (!staff || work.length === 0) return null;
  return (
    <Disclosure id="work" title={t("vcal.workSection.title")} summary={work.length === 1 ? t("vcal.workSection.waitingOne") : t("vcal.workSection.waiting", { count: work.length })}>
      <ul className="m-0 flex list-none flex-col p-0">
        {work.slice(0, 8).map((w) => (
          <li key={w.id} className="flex items-center gap-3 border-t py-2 text-sm first:border-t-0" style={{ borderColor: SURFACE.line }}>
            <span aria-hidden>{w.display_emoji ?? "📌"}</span>
            <span className="min-w-0 flex-1 truncate">{t(`vcal.work.${w.work!.kind}`)}</span>
            <span className="shrink-0" style={{ color: SURFACE.muted }}>{w.event?.title}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => navigate("/admin")} className="self-end text-sm" style={{ color: SURFACE.primary }}>
        {t("vcal.workSection.open")} →
      </button>
    </Disclosure>
  );
}

// ---------------------------------------------------------------- calendars

type Provider = SubscribeProvider;
const CAL_APP: Record<Provider, ConnectedAppId> = {
  google: "google-calendar",
  apple: "apple-calendar",
  outlook: "outlook-calendar",
};
const PROVIDERS: Provider[] = ["google", "apple", "outlook"];

/** Opens Connected Apps with this calendar app, where its own connect flow starts. */
export function connectLink(id: ConnectedAppId): string {
  return `/connectors?tab=productivity&connect=${id}`;
}

export function useCalendarApps(): { apps: ConnectedAppState[]; loading: boolean; connected: boolean | null } {
  const q = useQuery({ queryKey: CONNECTED_APPS_QUERY_KEY, queryFn: fetchConnectedApps, staleTime: 15_000 });
  const apps = (q.data ?? []).filter((a) => a.kind === "calendar");
  return {
    apps,
    loading: q.isLoading,
    // An expired connection still counts: the section shows it and asks to reconnect.
    connected: q.isSuccess ? apps.some((a) => a.status !== "off") : null,
  };
}

const ProviderMark = CalendarProviderLogo;

/**
 * VTID-04682: what tapping a calendar app does. Two-way sync through
 * Connected Apps when that app's sign-in is set up on this stack; otherwise
 * the subscription link for that app (Vitana's entries appear there).
 */
export function useConnectCalendar(onSubscribe: (p: Provider) => void) {
  const navigate = useNavigate();
  const { apps } = useCalendarApps();
  return (p: Provider) => {
    const app = apps.find((a) => a.id === CAL_APP[p]);
    if (app?.availability === "ready") navigate(connectLink(CAL_APP[p]));
    else onSubscribe(p);
  };
}

/** The prominent card shown near the top while no calendar app is connected. */
export function ConnectCalendarCard({ onSubscribe }: { onSubscribe: (p: Provider) => void }) {
  const { loading, connected } = useCalendarApps();
  const connect = useConnectCalendar(onSubscribe);
  if (loading || connected) return null;
  const name = (p: Provider) => t(`vcal.calendars.providers.${p}`);
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4" style={{ border: `1px solid ${SURFACE.line}` }} data-testid="vcal-connect">
      <div className="flex flex-col gap-0.5">
        <span className="text-[17px] font-medium">{t("vcal.calendars.connectTitle")}</span>
        <span className="text-sm" style={{ color: SURFACE.muted }}>
          {t("vcal.calendars.connectBody")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => connect(p)}
            className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-sm"
            style={{ border: `1px solid ${SURFACE.line}` }}
            data-testid={`vcal-connect-${p}`}
          >
            <ProviderMark p={p} size={44} />
            {name(p)}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Lower on the page, once a calendar app is connected. */
export function CalendarsSection({ onShowInApp }: { onShowInApp: (p?: Provider) => void }) {
  const navigate = useNavigate();
  const { apps, loading, connected } = useCalendarApps();
  const connect = useConnectCalendar(onShowInApp);
  if (loading || !connected) return null;
  const byProvider = (p: Provider) => apps.find((a) => a.id === CAL_APP[p]);
  const name = (p: Provider) => t(`vcal.calendars.providers.${p}`);
  const on = PROVIDERS.filter((p) => byProvider(p)?.status === "on");
  const reconnect = PROVIDERS.filter((p) => byProvider(p)?.status === "needs_reconnect");

  const summary =
    reconnect.length > 0
      ? t("vcal.calendars.needsReconnect", { name: name(reconnect[0]) })
      : on.length === 1
        ? t("vcal.calendars.connectedOne", { name: name(on[0]) })
        : t("vcal.calendars.connectedMany", { names: on.map(name).join(" · ") });

  return (
    <Disclosure id="calendars" title={t("vcal.calendars.title")} summary={summary} tone={reconnect.length ? "attention" : "normal"}>
      <ul className="m-0 flex list-none flex-col p-0">
        {PROVIDERS.map((p) => {
          const app = byProvider(p);
          const status = app?.status ?? "off";
          return (
            <li key={p} className="flex items-center gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: SURFACE.line }} data-testid={`vcal-calendar-${p}`}>
              <ProviderMark p={p} size={28} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px]">{name(p)}</span>
                <span className="truncate text-xs" style={{ color: status === "needs_reconnect" ? "#A3322C" : SURFACE.muted }}>
                  {status === "on" ? app?.account || t("vcal.calendars.connected") : status === "needs_reconnect" ? t("vcal.calendars.reconnectHint") : t("vcal.calendars.notConnected")}
                </span>
              </span>
              {status !== "on" && (
                <button type="button" onClick={() => connect(p)} className="h-8 shrink-0 rounded-full px-3 text-sm" style={{ color: SURFACE.primary, border: `1px solid ${SURFACE.line}` }}>
                  {status === "needs_reconnect" ? t("vcal.calendars.reconnect") : t("vcal.calendars.connect")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => onShowInApp()} className="self-start text-sm" style={{ color: SURFACE.primary }} data-testid="vcal-subscribe-open">
        {t("vcal.subscribe.title")}
      </button>
      <button type="button" onClick={() => navigate("/connectors?tab=productivity")} className="self-end text-sm" style={{ color: SURFACE.primary }}>
        {t("vcal.calendars.manage")} →
      </button>
    </Disclosure>
  );
}
