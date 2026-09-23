/**
 * VTID-04351 — building blocks of the calendar screen: entry card, grey busy
 * block, "next up" card, day progress ring and the Day/Week/Month switch.
 */
import { t } from "@/lib/i18n-toast";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, SURFACE, entryKind, isDone } from "./theme";
import { HEADING_FONT, itemEmoji, sourceLabel } from "./labels";
import { hhmm, nextReminderAt, relativeIn, timeRange, type CalendarView } from "./time";

interface EntryCardProps {
  item: CalendarWindowItem;
  onOpen: (item: CalendarWindowItem) => void;
  compact?: boolean;
}

export function EntryCard({ item, onOpen, compact }: EntryCardProps) {
  if (!item.event) return <BusyCard item={item} compact={compact} />;
  const e = item.event;
  const kind = entryKind(e);
  const style = KIND_STYLE[kind];
  const done = isDone(e);
  const sub = [t(`vcal.kinds.${kind}`), sourceLabel(item)].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full items-center gap-3 rounded-[18px] text-start transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        compact ? "px-2.5 py-2" : "px-3.5 py-3"
      }`}
      style={{ background: style.bg, color: style.ink, opacity: done ? 0.7 : 1 }}
      data-testid="vcal-entry"
    >
      <span aria-hidden className={compact ? "text-lg" : "text-[28px] leading-none"}>
        {itemEmoji(item)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {compact && <span className="text-[11px] font-extrabold opacity-80">{hhmm(item.start_time)}</span>}
        <span
          className={`truncate font-extrabold ${compact ? "text-[13px]" : "text-base"}`}
          style={{ textDecoration: done ? "line-through" : undefined }}
        >
          {e.title}
        </span>
        {!compact && <span className="truncate text-[13px] font-semibold">{sub}</span>}
      </span>
      {done && !compact && (
        <span aria-label={t("vcal.done")} className="text-[22px]">
          ✅
        </span>
      )}
    </button>
  );
}

export function BusyCard({ item, compact }: { item: CalendarWindowItem; compact?: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-[18px] font-bold ${compact ? "px-2.5 py-2 text-[12px]" : "px-3.5 py-3 text-sm"}`}
      style={{
        background: `repeating-linear-gradient(135deg, ${SURFACE.busyBg}, ${SURFACE.busyBg} 8px, #E6E1DB 8px, #E6E1DB 16px)`,
        color: SURFACE.busyInk,
      }}
      data-testid="vcal-busy"
      title={t(item.source === "google" ? "vcal.google.busyHint" : "vcal.busyHint")}
    >
      <span aria-hidden>{item.source === "google" ? "📆" : "🔒"}</span>
      <span className="truncate">
        {compact ? hhmm(item.start_time) + " · " : ""}
        {t(item.source === "google" ? "vcal.google.busy" : "vcal.busy")}
        {!compact && ` · ${timeRange(item.start_time, item.end_time)}`}
      </span>
    </div>
  );
}

export function NextUpCard({ item, now, onOpen }: { item: CalendarWindowItem; now: Date; onOpen: (i: CalendarWindowItem) => void }) {
  const e = item.event!;
  const style = KIND_STYLE[entryKind(e)];
  const bell = nextReminderAt(item.reminders, item.start_time, now);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-center gap-3.5 rounded-3xl p-4 text-start text-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ background: style.accent }}
      data-testid="vcal-next-up"
    >
      <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white/20 text-4xl">
        {itemEmoji(item)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[13px] font-extrabold uppercase tracking-wide opacity-90">
          {t("vcal.nextUp", { when: relativeIn(item.start_time, now) })}
        </span>
        <span className="truncate text-[22px] font-semibold" style={{ fontFamily: HEADING_FONT }}>
          {e.title}
        </span>
        <span className="truncate text-sm opacity-95">
          {timeRange(item.start_time, item.end_time)}
          {bell ? ` · 🔔 ${hhmm(bell)}` : ""}
        </span>
      </span>
    </button>
  );
}

export function DayProgress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="flex items-center gap-3.5 rounded-[20px] bg-white px-3.5 py-3"
      style={{ boxShadow: "0 2px 10px rgba(42,34,51,0.06)" }}
      data-testid="vcal-progress"
    >
      <div
        aria-hidden
        className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${SURFACE.primary} 0 ${pct}%, #E8E1D8 ${pct}% 100%)` }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-extrabold">
          {done}/{total}
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-extrabold">{t("vcal.progress", { done, total })}</span>
        <span className="text-sm" style={{ color: SURFACE.muted }}>
          {done === total ? t("vcal.progressAllDone") : t("vcal.progressKeepGoing")}
        </span>
      </div>
    </div>
  );
}

export function ViewSwitch({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  const views: CalendarView[] = ["day", "week", "month"];
  return (
    <div role="tablist" aria-label={t("vcal.title")} className="flex gap-1.5 rounded-full p-1" style={{ background: SURFACE.track }}>
      {views.map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className="h-10 flex-1 rounded-full text-[15px] transition-colors"
            style={{
              background: active ? SURFACE.ink : "transparent",
              color: active ? "#FFFFFF" : "#5A4F66",
              fontWeight: active ? 800 : 700,
            }}
          >
            {t(`vcal.views.${v}`)}
          </button>
        );
      })}
    </div>
  );
}
