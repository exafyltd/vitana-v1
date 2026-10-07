/**
 * VTID-04351 — Day, Week and Month views of the calendar screen.
 * Each view is handed the items for exactly its own range (see viewRange).
 *
 * VTID-04681: a view never floods. A week column shows its first WEEK_LIMIT
 * entries and "+N more"; a month cell up to three dots. Milestones are quiet
 * markers, not tasks, and never count.
 * VTID-04956: in the Week and the Month a tapped day opens a panel IN PLACE
 * (the member stays on that screen): every entry of that day one by one and a
 * button to add one for that day. The Day view is back to its earlier content.
 */
import { Fragment, useState } from "react";
import { Plus, X } from "lucide-react";
import { addDays } from "date-fns";
import { t } from "@/lib/i18n-toast";
import { fmtDate, formatDate } from "@/lib/locale-format";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { INDEX_CARD, INDEX_SOFT_BTN } from "@/lib/index-look";
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

export function DayView({ items, onOpen, summary }: { items: CalendarWindowItem[]; onOpen: Open; summary?: string }) {
  const [all, setAll] = useState(false);
  if (!items.length) return <EmptyDay />;
  const markers = items.filter(isMilestone);
  const entries = items.filter((i) => !isMilestone(i));
  const shown = all ? entries : entries.slice(0, DAY_LIMIT);
  const hidden = entries.length - shown.length;
  return (
    <div className="flex flex-col gap-2" data-testid="vcal-day">
      {summary && (
        <p className="px-1 text-[15px] leading-snug text-slate-700" data-testid="vcal-summary">
          {summary}
        </p>
      )}
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

/**
 * VTID-04956 — the panel a tapped day opens in the Week and the Month: the
 * day's whole list one by one, and a button (never a text field) that opens the
 * add sheet for that day. The member stays on the Week or Month screen.
 */
export function DayPanel({
  day,
  items,
  onOpen,
  onAdd,
  onClose,
}: {
  day: Date;
  items: CalendarWindowItem[];
  onOpen: Open;
  onAdd: (d: Date) => void;
  onClose: () => void;
}) {
  const dayItems = itemsOn(items, day);
  const markers = dayItems.filter(isMilestone);
  const entries = dayItems.filter((i) => !isMilestone(i));
  const label = fmtDate(day, { weekday: "long", day: "numeric", month: "long" });
  const shortLabel = fmtDate(day, { weekday: "short", day: "numeric", month: "short" }); // fits the add button on a phone
  return (
    <div className={`${INDEX_CARD} flex min-w-0 flex-col gap-3`} data-testid="vcal-day-panel" role="region" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-lg font-bold text-slate-900">{label}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("vcal.entry.close")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          data-testid="vcal-day-panel-close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button type="button" onClick={() => onAdd(day)} className={`${INDEX_SOFT_BTN} w-full justify-start`} data-testid="vcal-add-day">
        <Plus className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate">{t("vcal.day.addFor", { date: shortLabel })}</span>
      </button>
      {markers.map((m) => (
        <EntryCard key={m.id} item={m} onOpen={onOpen} />
      ))}
      {entries.length === 0 ? (
        <span className="px-1 text-sm" style={{ color: SURFACE.muted }} data-testid="vcal-day-panel-empty">
          {t("vcal.empty.title")}
        </span>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((item) => (
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
    </div>
  );
}

export function WeekView({
  anchor,
  items,
  now,
  onOpen,
  onAdd,
}: {
  anchor: Date;
  items: CalendarWindowItem[];
  now: Date;
  onOpen: Open;
  onAdd: (d: Date) => void;
}) {
  const { from } = viewRange("week", anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  // VTID-04956: a tapped day opens in place; Calendar.tsx keys this view by the week so it closes on a new week.
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const toggle = (d: Date) => setOpenDay((cur) => (cur && sameDay(cur, d) ? null : d));
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7" data-testid="vcal-week">
      {days.map((day) => {
        const dayItems = itemsOn(items, day).filter((i) => !isMilestone(i));
        const isToday = sameDay(day, now);
        const isOpen = !!openDay && sameDay(openDay, day);
        const hidden = dayItems.length - WEEK_LIMIT;
        return (
          <Fragment key={day.toISOString()}>
            <section
              className={`flex min-w-0 flex-col gap-1.5 rounded-3xl border bg-white p-3 shadow-[0_6px_24px_rgba(15,23,42,0.06)] ${isToday || isOpen ? "" : "border-slate-100"}`}
              aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}
              style={
                isOpen
                  ? { borderColor: SURFACE.today, boxShadow: `0 0 0 2px ${SURFACE.today}` }
                  : isToday
                    ? { borderColor: SURFACE.today, boxShadow: `0 0 0 1px ${SURFACE.today}` }
                    : undefined
              }
            >
              <button type="button" onClick={() => toggle(day)} aria-expanded={isOpen} className="flex items-baseline gap-2 text-start" data-testid="vcal-week-day">
                <span className="text-xs" style={{ color: SURFACE.muted }}>
                  {formatDate(day, "EEE")}
                </span>
                <span className={`text-lg ${isToday ? "font-bold" : ""}`} style={isToday ? { color: SURFACE.today } : undefined}>
                  {formatDate(day, "d")}
                </span>
              </button>
              {dayItems.length ? (
                <div className="flex flex-col gap-1.5">
                  {dayItems.slice(0, WEEK_LIMIT).map((item) => (
                    <EntryCard key={item.id} item={item} onOpen={onOpen} compact />
                  ))}
                  {hidden > 0 && <MoreButton count={hidden} onClick={() => toggle(day)} />}
                </div>
              ) : (
                <span className="text-xs" style={{ color: SURFACE.faint }}>
                  {t("vcal.week.free")}
                </span>
              )}
            </section>
            {isOpen && (
              <div className="min-w-0 md:order-last md:col-span-7">
                <DayPanel day={day} items={items} onOpen={onOpen} onAdd={onAdd} onClose={() => setOpenDay(null)} />
              </div>
            )}
          </Fragment>
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
  onOpen,
  onAdd,
}: {
  anchor: Date;
  items: CalendarWindowItem[];
  now: Date;
  onOpen: Open;
  onAdd: (d: Date) => void;
}) {
  const { from } = viewRange("month", anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const month = anchor.getMonth();
  // VTID-04956: a tapped day opens in place under the grid; Calendar.tsx keys this view by the month.
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const toggle = (d: Date) => setOpenDay((cur) => (cur && sameDay(cur, d) ? null : d));
  return (
    <div className="flex flex-col gap-2">
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
            const isOpen = !!openDay && sameDay(openDay, day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => toggle(day)}
                aria-label={fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}
                aria-expanded={isOpen}
                className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                style={{ color: inMonth ? SURFACE.ink : SURFACE.faint, boxShadow: isOpen ? `inset 0 0 0 2px ${SURFACE.today}` : undefined }}
                data-testid="vcal-month-day"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday ? "font-bold" : ""}`}
                  style={isToday ? { background: SURFACE.today, color: "#FFFFFF" } : undefined}
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
      {openDay && <DayPanel day={openDay} items={items} onOpen={onOpen} onAdd={onAdd} onClose={() => setOpenDay(null)} />}
    </div>
  );
}
