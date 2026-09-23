/**
 * VTID-04351 — an entry opened full-screen: big emoji, when/where, the
 * countdown, what it is about, the reminders it will really get, and the
 * actions (mark done, directions, ask Vitana).
 */
import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import { activateOrb } from "@/lib/orbActivate";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, SURFACE, entryKind, isDone } from "./theme";
import { HEADING_FONT, itemEmoji, sourceLabel } from "./labels";
import { reminderLabel, relativeIn, timeRange } from "./time";

interface Props {
  item: CalendarWindowItem;
  now: Date;
  onClose: () => void;
  onComplete?: (item: CalendarWindowItem) => void;
  completing?: boolean;
}

export function EntryScreen({ item, now, onClose, onComplete, completing }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const e = item.event!;
  const style = KIND_STYLE[entryKind(e)];
  const done = isDone(e);
  const future = Date.parse(item.start_time) > now.getTime();
  const source = sourceLabel(item);
  // A recurring entry is one row with many occurrences; completing it would
  // complete the whole series, so only one-off entries get the button.
  // VTID-04357: work-lens items are finished where they live, not here.
  const canComplete = !done && item.occurrence_index === null && !item.work && !!onComplete;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const openDirections = () => {
    if (!e.location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`, "_blank", "noopener");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={e.title}
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto"
      style={{ background: SURFACE.page, color: SURFACE.ink, fontFamily: "Nunito, system-ui, sans-serif" }}
      data-testid="vcal-entry-screen"
    >
      <header className="flex flex-col gap-3.5 rounded-b-[36px] px-[22px] pb-7 pt-5 text-white" style={{ background: style.accent }}>
        <div className="flex items-center justify-between gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("vcal.entry.close")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>
          {source && (
            <span className="truncate rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-wide">{source}</span>
          )}
        </div>
        <div aria-hidden className="text-[76px] leading-none">
          {itemEmoji(item)}
        </div>
        <h1 className="m-0 text-[34px] font-bold leading-tight" style={{ fontFamily: HEADING_FONT }}>
          {e.title}
        </h1>
        <div className="flex flex-col gap-1 text-[17px] font-bold">
          <span>📅 {fmtDate(item.start_time, { weekday: "long", day: "numeric", month: "long" })}</span>
          <span>
            🕗 {timeRange(item.start_time, item.end_time)}
            {e.location ? ` · ${e.location}` : ""}
          </span>
          {e.rrule && <span>🔁 {t("vcal.recurring")}</span>}
        </div>
        {done ? (
          <span className="self-start rounded-full bg-white px-3.5 py-2 text-[15px] font-extrabold" style={{ color: style.ink }}>
            ✅ {t("vcal.done")}
          </span>
        ) : future ? (
          <span className="self-start rounded-full bg-white px-3.5 py-2 text-[15px] font-extrabold" style={{ color: style.ink }}>
            ⏳ {relativeIn(item.start_time, now)}
          </span>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-5 px-[22px] py-5">
        {item.work && (
          <p className="m-0 rounded-2xl px-4 py-3 text-[15px] font-bold" style={{ background: style.bg, color: style.ink }} data-testid="vcal-work-note">
            {t("vcal.work.readOnly")}
          </p>
        )}

        {e.description && (
          <section className="flex flex-col gap-1.5">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: SURFACE.muted }}>
              {t("vcal.entry.about")}
            </h2>
            <p className="m-0 whitespace-pre-line text-base leading-relaxed">{e.description}</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: SURFACE.muted }}>
            {t("vcal.entry.reminders")}
          </h2>
          <div className="flex flex-wrap gap-2" data-testid="vcal-reminders">
            {item.reminders?.length ? (
              item.reminders.map((r, i) => (
                <span key={i} className="rounded-full px-3.5 py-2 text-sm font-extrabold" style={{ background: style.bg, color: style.ink }}>
                  🔔 {reminderLabel(r)}
                </span>
              ))
            ) : (
              <span className="text-sm font-bold" style={{ color: SURFACE.muted }}>
                {t("vcal.entry.noReminders")}
              </span>
            )}
          </div>
        </section>
      </div>

      {/* pb clears the app-wide Vitana orb button that floats bottom-centre on phones */}
      <footer className="flex flex-col gap-2.5 px-[22px] pb-28 md:pb-7">
        {canComplete && (
          <button
            type="button"
            disabled={completing}
            onClick={() => onComplete!(item)}
            className="h-14 rounded-[18px] text-lg font-extrabold text-white disabled:opacity-60"
            style={{ background: style.accent }}
            data-testid="vcal-complete"
          >
            ✅ {t("vcal.markDone")}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {e.location && (
            <button type="button" onClick={openDirections} className="h-[52px] rounded-2xl text-[15px] font-extrabold" style={{ background: SURFACE.track }}>
              🗺️ {t("vcal.entry.directions")}
            </button>
          )}
          <button
            type="button"
            onClick={() => activateOrb()}
            className={`h-[52px] rounded-2xl text-[15px] font-extrabold ${e.location ? "" : "col-span-2"}`}
            style={{ background: SURFACE.track }}
          >
            🎙️ {t("vcal.entry.askVitana")}
          </button>
        </div>
      </footer>
    </div>
  );
}
