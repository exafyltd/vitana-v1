/**
 * VTID-04351 — Day, Week and Month views of the calendar screen.
 * Each view is handed the items for exactly its own range (see viewRange).
 *
 * VTID-04681: a view never floods. A day shows its first DAY_LIMIT entries
 * and "+N more"; a week column its first WEEK_LIMIT; a month cell up to three
 * dots. Milestones are quiet markers, not tasks, and never count.
 */
import { useState } from "react";
import { addDays } from "date-fns";
import { t } from "@/lib/i18n-toast";
import { fmtDate, formatDate } from "@/lib/locale-format";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { INDEX_CARD } from "@/lib/index-look";
import { KIND_STYLE, SURFACE, entryKind } from "./theme";
import { EntryCard, isMilestone } from "./parts";
import { itemsOn } from "./labels";
import { hhmm, sameDay, viewRange } from "./time";

type Open = (item: CalendarWindowItem) => void;

export const DAY_LIMIT = 5;
export const WEEK_LIMIT = 3;
export const MONTH_DOTS = 3;

export function EmptyDay() {
  return (
    <div className={`${INDEX_CARD} flex flex-col items-center gap-1 py-8 text-center`} data-testid="vcal-empty">
      <span className="text-lg font-bold text-slate-900">{t("vcal.empty.title")}</span>
      <span className="text-sm" style={{ color: SURFACE.muted }}>
        {t("vcal.empty.hint")}
      </span>
    </div>
  );
}

function MoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="self-start px-1 py-1 text-sm font-semibold" style={{ color: SURFACE.link }} data-testid="vcal-more">
      {t("vcal.more", { count })}
    </button>
  );
}

export function DayView({ items, onOpen }: { items: CalendarWindowItem[]; onOpen: Open }) {
  const [all, setAll] = useState(false);
  if (!items.length) return <EmptyDay />;
  const markers = items.filter(isMilestone);
  const entries = items.filter((i) => !isMilestone(i));
  const shown = all ? entries : entries.slice(0, DAY_LIMIT);
  const hidden = entries.length - shown.length;
  return (
    <div className="flex flex-col gap-2" data-testid="vcal-day">
      {markers.map((m) => (
        <EntryCard key={m.id} item={m} onOpen={onOpen} />
      ))}
      {entries.length === 0 ? (
        <EmptyDay />
      ) : (
        <ol className="flex flex-col gap-2">
          {shown.map((item) => (
            <li key={item.id} className="flex items-stretch gap-3">
              <span className="w-12 shrink-0 whitespace-nowrap pt-3.5 text-xs tabular-nums" style={{ color: SURFACE.muted }}>
                {hhmm(item.start_time)}
              </span>
              <div className="min-w-0 flex-1">
                <EntryCard item={item} onOpen={onOpen} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {hidden > 0 && <MoreButton count={hidden} onClick={() => setAll(true)} />}
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
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7" data-testid="vcal-week">
      {days.map((day) => {
        const dayItems = itemsOn(items, day).filter((i) => !isMilestone(i));
        const isToday = sameDay(day, now);
        const hidden = dayItems.length - WEEK_LIMIT;
        return (
          <section
            key={day.toISOString()}
            className={`flex min-w-0 flex-col gap-1.5 rounded-3xl border bg-white p-3 shadow-[0_6px_24px_rgba(15,23,42,0.06)] ${isToday ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"}`}
            aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}
          >
            <button type="button" onClick={() => onPickDay(day)} className="flex items-baseline gap-2 text-start">
              <span className="text-xs" style={{ color: SURFACE.muted }}>
                {formatDate(day, "EEE")}
              </span>
              <span className={`text-lg ${isToday ? "font-bold text-teal-700" : ""}`}>{formatDate(day, "d")}</span>
            </button>
            {dayItems.length ? (
              <div className="flex flex-col gap-1.5">
                {dayItems.slice(0, WEEK_LIMIT).map((item) => (
                  <EntryCard key={item.id} item={item} onOpen={onOpen} compact />
                ))}
                {hidden > 0 && <MoreButton count={hidden} onClick={() => onPickDay(day)} />}
              </div>
            ) : (
              <span className="text-xs" style={{ color: SURFACE.faint }}>
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
    <div className={`${INDEX_CARD} flex flex-col gap-1.5 !p-3`} data-testid="vcal-month">
      <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ color: SURFACE.faint }}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>{formatDate(addDays(WEEKDAY_REF, i), "EEEEEE")}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayItems = itemsOn(items, day).filter((i) => i.event && !isMilestone(i));
          const inMonth = day.getMonth() === month;
          const isToday = sameDay(day, now);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}
              className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              style={{ color: inMonth ? SURFACE.ink : SURFACE.faint }}
              data-testid="vcal-month-day"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday ? "font-bold" : ""}`}
                style={isToday ? { background: SURFACE.link, color: "#FFFFFF" } : undefined}
              >
                {formatDate(day, "d")}
              </span>
              <span className="flex h-1.5 gap-0.5" aria-hidden>
                {dayItems.slice(0, MONTH_DOTS).map((i) => (
                  <span key={i.id} className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_STYLE[entryKind(i.event!)].accent }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
