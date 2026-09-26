/**
 * The calendar's three folding sections (VTID-04536): your journey, your
 * reminders, and the calendars you have connected. Each closed header says
 * what is inside; nothing here duplicates a screen that already exists —
 * reminders are the Reminders panel, calendar apps are Connected Apps.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { useReminders } from "@/hooks/useReminders";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from "@/lib/i18n-toast";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { fetchConnectedApps, type ConnectedAppId, type ConnectedAppState } from "@/lib/connected-apps-client";
import { CONNECTED_APPS_QUERY_KEY } from "@/components/settings/connected-apps/MailCalendarContactsPanel";
import { Disclosure } from "./Disclosure";
import { itemEmoji } from "./labels";
import { SURFACE } from "./theme";
import { sameDay } from "./time";

// ---------------------------------------------------------------- journey

export function JourneySection({ steps, now, onOpenStep }: { steps: CalendarWindowItem[]; now: Date; onOpenStep: (i: CalendarWindowItem) => void }) {
  const progress = useJourneyProgress();
  const { translate } = useTranslation();
  const navigate = useNavigate();
  if (!progress && steps.length === 0) return null;

  const wave = progress ? translate(progress.wave.nameKey, progress.wave.name) : t("vcal.journey.title");
  const summary =
    steps.length > 0
      ? `${wave} · ${steps.length === 1 ? t("vcal.journey.openOne") : t("vcal.journey.open", { count: steps.length })}`
      : progress
        ? `${wave} · ${t("vcal.journey.day", { day: progress.dayNumber })}`
        : wave;

  return (
    <Disclosure id="journey" emoji="🧭" title={t("vcal.journey.title")} summary={summary}>
      {progress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm font-bold" style={{ color: SURFACE.muted }}>
            <span>{wave}</span>
            <span>{t("vcal.journey.dayOf", { day: progress.dayNumber, total: 90 })}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: SURFACE.track }}>
            <div className="h-full rounded-full" style={{ width: `${progress.waveProgress}%`, background: "#C99A2E" }} />
          </div>
        </div>
      )}
      {steps.length === 0 ? (
        <p className="m-0 text-sm" style={{ color: SURFACE.muted }}>
          {t("vcal.journey.noneOpen")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, 5).map((s) => {
            const start = new Date(s.start_time);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpenStep(s)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start"
                  style={{ background: "#FFF6E3" }}
                  data-testid="vcal-journey-step"
                >
                  <span aria-hidden className="text-lg">{itemEmoji(s)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-bold">{s.event?.title}</span>
                    <span className="text-xs" style={{ color: SURFACE.muted }}>
                      {sameDay(start, now) ? t("vcal.journey.today", { time: fmtTime(start, { hour: "2-digit", minute: "2-digit" }) }) : fmtDate(start, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold" style={{ color: SURFACE.primary }}>
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
        <button type="button" onClick={() => navigate("/autopilot")} className="text-sm font-extrabold" style={{ color: SURFACE.primary }}>
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
    <Disclosure id="reminders" emoji="🔔" title={t("vcal.remindersSection.title")} summary={summary}>
      <RemindersPanel embedded />
    </Disclosure>
  );
}

// ---------------------------------------------------------------- calendars

type Provider = "google" | "apple" | "outlook";
const CAL_APP: Record<Provider, ConnectedAppId> = {
  google: "google-calendar",
  apple: "apple-calendar",
  outlook: "outlook-calendar",
};
const PROVIDERS: Provider[] = ["google", "apple", "outlook"];
const PROVIDER_MARK: Record<Provider, { letter: string; bg: string; fg: string }> = {
  google: { letter: "G", bg: "#E8F0FE", fg: "#1A56C8" },
  apple: { letter: "i", bg: "#EFEFF2", fg: "#1D1D1F" },
  outlook: { letter: "O", bg: "#E3F1FB", fg: "#0A5FA8" },
};

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

function ProviderMark({ p }: { p: Provider }) {
  const m = PROVIDER_MARK[p];
  return (
    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" style={{ background: m.bg, color: m.fg }}>
      {m.letter}
    </span>
  );
}

export function CalendarsSection({ onShowInApp }: { onShowInApp: () => void }) {
  const navigate = useNavigate();
  const { apps, loading, connected } = useCalendarApps();
  if (loading) return null;
  const byProvider = (p: Provider) => apps.find((a) => a.id === CAL_APP[p]);
  const name = (p: Provider) => t(`vcal.calendars.providers.${p}`);
  const on = PROVIDERS.filter((p) => byProvider(p)?.status === "on");
  const reconnect = PROVIDERS.filter((p) => byProvider(p)?.status === "needs_reconnect");
  const noneReady = apps.length > 0 && apps.every((a) => a.availability !== "ready");

  const showInApp = (
    <button type="button" onClick={onShowInApp} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start" style={{ background: SURFACE.page }} data-testid="vcal-subscribe-open">
      <span aria-hidden className="text-lg">📲</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-bold">{t("vcal.subscribe.title")}</span>
        <span className="text-xs" style={{ color: SURFACE.muted }}>{t("vcal.calendars.showInAppHint")}</span>
      </span>
      <span aria-hidden style={{ color: SURFACE.faint }}>›</span>
    </button>
  );

  // Nothing connected: the connect card stays open and visible.
  if (!connected) {
    return (
      <section className="flex flex-col gap-3 rounded-[20px] px-4 py-4" style={{ background: "#FFFFFF", boxShadow: "0 2px 10px rgba(42,34,51,0.06)", border: `2px solid ${SURFACE.primary}` }} data-testid="vcal-connect">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-extrabold">📅 {t("vcal.calendars.connectTitle")}</span>
          <span className="text-sm" style={{ color: SURFACE.muted }}>{t("vcal.calendars.connectBody")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => navigate(connectLink(CAL_APP[p]))}
              className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-sm font-extrabold"
              style={{ background: SURFACE.page }}
              data-testid={`vcal-connect-${p}`}
            >
              <ProviderMark p={p} />
              {name(p)}
            </button>
          ))}
        </div>
        {noneReady && <span className="text-xs" style={{ color: SURFACE.muted }}>{t("vcal.calendars.comingSoon")}</span>}
        {showInApp}
      </section>
    );
  }

  const summary =
    reconnect.length > 0
      ? t("vcal.calendars.needsReconnect", { name: name(reconnect[0]) })
      : on.length === 1
        ? t("vcal.calendars.connectedOne", { name: name(on[0]) })
        : t("vcal.calendars.connectedMany", { names: on.map(name).join(" · ") });

  return (
    <Disclosure id="calendars" emoji="📅" title={t("vcal.calendars.title")} summary={summary} tone={reconnect.length ? "attention" : "normal"}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {PROVIDERS.map((p) => {
          const app = byProvider(p);
          const status = app?.status ?? "off";
          return (
            <li key={p} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: SURFACE.page }} data-testid={`vcal-calendar-${p}`}>
              <ProviderMark p={p} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold">{name(p)}</span>
                <span className="truncate text-xs" style={{ color: status === "needs_reconnect" ? "#A3322C" : SURFACE.muted }}>
                  {status === "on" ? app?.account || t("vcal.calendars.connected") : status === "needs_reconnect" ? t("vcal.calendars.reconnectHint") : t("vcal.calendars.notConnected")}
                </span>
              </span>
              {status !== "on" && (
                <button type="button" onClick={() => navigate(connectLink(CAL_APP[p]))} className="h-9 shrink-0 rounded-full px-3.5 text-sm font-extrabold text-white" style={{ background: SURFACE.primary }}>
                  {status === "needs_reconnect" ? t("vcal.calendars.reconnect") : t("vcal.calendars.connect")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {showInApp}
      <button type="button" onClick={() => navigate("/connectors?tab=productivity")} className="self-end text-sm font-extrabold" style={{ color: SURFACE.primary }}>
        {t("vcal.calendars.manage")} →
      </button>
    </Disclosure>
  );
}
