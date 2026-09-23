/**
 * VTID-04351 — Day, Week and Month views of the calendar screen.
 * Each view is handed the items for exactly its own range (see viewRange).
 */
import { addDays } from "date-fns";
import { t } from "@/lib/i18n-toast";
import { fmtDate, formatDate } from "@/lib/locale-format";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, SURFACE, entryKind } from "./theme";
import { EntryCard } from "./parts";
import { itemEmoji, itemsOn } from "./labels";
import { hhmm, sameDay, viewRange } from "./time";

type Open = (item: CalendarWindowItem) => void;

export function EmptyDay() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-6 py-10 text-center" data-testid="vcal-empty">
      <span aria-hidden className="text-5xl">
        🌿
      </span>
      <span className="text-lg font-extrabold">{t("vcal.empty.title")}</span>
      <span className="text-sm" style={{ color: SURFACE.muted }}>
        {t("vcal.empty.hint")}
      </span>
    </div>
  );
}

export function DayView({ items, onOpen }: { items: CalendarWindowItem[]; onOpen: Open }) {
  if (!items.length) return <EmptyDay />;
  return (
    <ol className="flex flex-col gap-2.5" data-testid="vcal-day">
      {items.map((item) => (
        <li key={item.id} className="flex items-stretch gap-3">
          <span className="w-[4.25rem] shrink-0 whitespace-nowrap pt-3.5 text-[12px] font-extrabold" style={{ color: SURFACE.faint }}>
            {hhmm(item.start_time)}
          </span>
          <div className="min-w-0 flex-1">
            <EntryCard item={item} onOpen={onOpen} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Thin bar of pillar colours under a day — how balanced the day is. */
function BalanceBar({ items }: { items: CalendarWindowItem[] }) {
  const visible = items.filter((i) => i.event);
  if (!visible.length) return <div className="h-1.5 rounded-full" style={{ background: SURFACE.track }} />;
  return (
    <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {visible.map((i) => (
        <span key={i.id} className="flex-1" style={{ background: KIND_STYLE[entryKind(i.event!)].accent }} />
      ))}
    </div>
  );
}

export function WeekView({
  anchor,
  items,
  now,
  onOpen,
  onPickDay,
}: {
  anchor: Date;
  items: CalendarWindowItem[];
  now: Date;
  onOpen: Open;
  onPickDay: (d: Date) => void;
}) {
  const { from } = viewRange("week", anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7 md:gap-2" data-testid="vcal-week">
      {days.map((day) => {
        const dayItems = itemsOn(items, day);
        const isToday = sameDay(day, now);
        return (
          <section key={day.toISOString()} className="flex min-w-0 flex-col gap-2 rounded-3xl bg-white p-3" aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}>
            <button type="button" onClick={() => onPickDay(day)} className="flex items-baseline gap-2 text-start md:flex-col md:gap-0">
              <span className="text-[13px] font-extrabold uppercase" style={{ color: SURFACE.muted }}>
                {formatDate(day, "EEE")}
              </span>
              <span
                className="flex h-9 min-w-9 items-center justify-center rounded-full px-1 text-xl font-bold"
                style={{
                  fontFamily: "Fredoka, Nunito, sans-serif",
                  background: isToday ? SURFACE.ink : "transparent",
                  color: isToday ? "#FFFFFF" : SURFACE.ink,
                }}
              >
                {formatDate(day, "d")}
              </span>
            </button>
            <BalanceBar items={dayItems} />
            {dayItems.length ? (
              <div className="flex flex-col gap-1.5">
                {dayItems.map((item) => (
                  <EntryCard key={item.id} item={item} onOpen={onOpen} compact />
                ))}
              </div>
            ) : (
              <span className="text-[13px] font-bold" style={{ color: SURFACE.faint }}>
                {t("vcal.week.free")}
              </span>
            )}
          </section>
        );
      })}
    </div>
  );
}

const WEEKDAY_REF = new Date(2024, 0, 1); // a Monday — only used to name columns

export function MonthView({
  anchor,
  items,
  now,
  onPickDay,
}: {
  anchor: Date;
  items: CalendarWindowItem[];
  now: Date;
  onPickDay: (d: Date) => void;
}) {
  const { from } = viewRange("month", anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const month = anchor.getMonth();
  return (
    <div className="flex flex-col gap-2" data-testid="vcal-month">
      <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-extrabold" style={{ color: SURFACE.faint }}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{formatDate(addDays(WEEKDAY_REF, i), "EEEEEE")}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayItems = itemsOn(items, day).filter((i) => i.event);
          const inMonth = day.getMonth() === month;
          const isToday = sameDay(day, now);
          const extra = dayItems.length - 3;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}
              className="flex aspect-square min-w-0 flex-col items-center gap-0.5 rounded-2xl p-1 focus:outline-none focus-visible:ring-2"
              style={{
                background: isToday ? SURFACE.ink : inMonth ? "#FFFFFF" : "transparent",
                color: isToday ? "#FFFFFF" : inMonth ? SURFACE.ink : SURFACE.faint,
              }}
              data-testid="vcal-month-day"
            >
              <span className="text-sm font-extrabold">{formatDate(day, "d")}</span>
              <span className="flex flex-wrap justify-center text-[13px] leading-tight" aria-hidden>
                {dayItems.slice(0, 3).map((i) => (
                  <span key={i.id}>{itemEmoji(i)}</span>
                ))}
              </span>
              {extra > 0 && <span className="text-[10px] font-extrabold">{t("vcal.month.more", { count: extra })}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
