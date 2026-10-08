/**
 * VTID-04351 — building blocks of the calendar screen: entry card, grey busy
 * block, milestone marker and the Day/Week/Month switch.
 *
 * VTID-04681: calm by default.
 * VTID-04852: the look of the Vitana Index page — white rounded cards with a
 * soft shadow, a tinted icon tile per entry, a green check when done.
 */
import { Check } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, SURFACE, entryKind, isDone } from "./theme";
import { entryTitle, itemEmoji, sourceLabel } from "./labels";
import { hhmm, timeRange, type CalendarView } from "./time";

interface EntryCardProps {
  item: CalendarWindowItem;
  onOpen: (item: CalendarWindowItem) => void;
  compact?: boolean;
}

/** A goal-plan milestone: a date the member set, shown as a quiet marker, not a task. */
export function isMilestone(item: CalendarWindowItem): boolean {
  return item.event?.event_type === "journey_milestone" && item.event?.source_type === "goal_plan";
}

export function EntryCard({ item, onOpen, compact }: EntryCardProps) {
  if (!item.event) return <BusyCard item={item} compact={compact} />;
  if (isMilestone(item)) return <MilestoneMarker item={item} onOpen={onOpen} compact={compact} />;
  const e = item.event;
  const kind = entryKind(e);
  const style = KIND_STYLE[kind];
  const done = isDone(e);
  const sub = [compact ? null : timeRange(item.start_time, item.end_time), sourceLabel(item) ?? t(`vcal.kinds.${kind}`)]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white text-start shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        compact ? "px-2 py-2" : "px-3.5 py-3"
      }`}
      style={{ color: SURFACE.ink, opacity: done ? 0.7 : 1 }}
      data-testid="vcal-entry"
    >
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-2xl ${compact ? "h-8 w-8 text-base" : "h-10 w-10 text-xl leading-none"}`}
        style={{ background: style.bg }}
      >
        {itemEmoji(item)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {compact && <span className="text-xs" style={{ color: SURFACE.muted }}>{hhmm(item.start_time)}</span>}
        <span className={`truncate font-semibold ${compact ? "text-xs" : "text-[15px]"}`} style={{ textDecoration: done ? "line-through" : undefined }}>
          {entryTitle(e)}
        </span>
        {!compact && (
          <span className="truncate text-sm" style={{ color: SURFACE.muted }}>
            {sub}
          </span>
        )}
      </span>
      {done && !compact && (
        <span aria-label={t("vcal.done")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-4 w-4" aria-hidden />
        </span>
      )}
    </button>
  );
}

export function MilestoneMarker({ item, onOpen, compact }: EntryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full items-center gap-2 rounded-xl text-start ${compact ? "px-1 py-1 text-xs" : "px-1 py-1.5 text-sm"}`}
      style={{ color: SURFACE.muted }}
      data-testid="vcal-milestone"
    >
      <span aria-hidden>🏁</span>
      <span className="truncate">{t("vcal.milestone", { title: item.event?.title ?? "" })}</span>
    </button>
  );
}

export function BusyCard({ item, compact }: { item: CalendarWindowItem; compact?: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-2xl ${compact ? "px-2.5 py-2 text-xs" : "px-3.5 py-3 text-sm"}`}
      style={{
        background: `repeating-linear-gradient(135deg, ${SURFACE.busyBg}, ${SURFACE.busyBg} 8px, #E2E8F0 8px, #E2E8F0 16px)`,
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

export function ViewSwitch({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  const views: CalendarView[] = ["day", "week", "month"];
  return (
    <div role="tablist" aria-label={t("vcal.title")} className="flex gap-1 rounded-full p-1 ring-1 ring-slate-200/70" style={{ background: SURFACE.track }}>
      {views.map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`h-10 flex-1 rounded-full text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${active ? "font-semibold" : ""}`}
            style={{
              background: active ? "#FFFFFF" : "transparent",
              color: active ? SURFACE.ink : SURFACE.muted,
              boxShadow: active ? "0 1px 3px rgba(15,23,42,0.12)" : undefined,
            }}
          >
            {t(`vcal.views.${v}`)}
          </button>
        );
      })}
    </div>
  );
}
