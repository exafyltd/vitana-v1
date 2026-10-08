/**
 * VTID-04351 — an entry opened full-screen: big emoji, when/where, the
 * countdown, what it is about, the reminders it will really get, and the
 * actions (mark done, directions, ask Vitana).
 *
 * VTID-04915: plus edit and remove for the member's own entries, and the
 * way back to where an entry came from — the community event, or the live
 * room (with "Join" from 15 minutes before it starts). The rules live in
 * entry-actions.ts.
 *
 * VTID-04951: an event or live room that is over says so — a chip, a banner,
 * and every action on it answers "in the past, not active" instead of
 * walking the member into a dead room. "Ask Vitana" opens the guide for this
 * entry (its state travels along) instead of the daily greeting.
 *
 * VTID-04916: and "share to the feed" for a community event or live room the
 * member is going to (the gateway decides `shareable`); once shared, a link
 * to the post instead.
 */
import { useEffect, useRef, useState } from "react";
import { notify, t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import { activateOrbGuide } from "@/lib/orbActivate";
import type { CalendarEntryPatch, CalendarWindowItem, ShareToFeedInput } from "@/lib/calendar-window-client";
import { KIND_STYLE, SURFACE, entryKind, isDone } from "./theme";
import { entryTitle, itemEmoji, sourceLabel } from "./labels";
import { reminderLabel, relativeIn, timeRange, toLocalInput } from "./time";
import { canEditEntry, canRemoveEntry, entryTimeState, isEndedSourceEntry, sourceActionOf } from "./entry-actions";
import { ShareToFeedPanel } from "./ShareToFeedPanel";

interface Props {
  item: CalendarWindowItem;
  now: Date;
  onClose: () => void;
  onComplete?: (item: CalendarWindowItem) => void;
  completing?: boolean;
  /** VTID-04374: move a one-off entry of the member's own to a new start. */
  onMove?: (item: CalendarWindowItem, start: Date) => void;
  moving?: boolean;
  /** VTID-04915: change the member's own entry. */
  onEdit?: (item: CalendarWindowItem, patch: CalendarEntryPatch) => void;
  saving?: boolean;
  /** VTID-04915: remove the member's own entry. */
  onRemove?: (item: CalendarWindowItem) => void;
  removing?: boolean;
  /** VTID-04915: go to the event or live room the entry belongs to. */
  onOpenSource?: (path: string) => void;
  /** VTID-04916: post the event to the news feed. */
  onShare?: (item: CalendarWindowItem, input: ShareToFeedInput) => void;
  sharing?: boolean;
}


export function EntryScreen({ item, now, onClose, onComplete, completing, onMove, moving, onEdit, saving, onRemove, removing, onOpenSource, onShare, sharing }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const e = item.event!;
  const style = KIND_STYLE[entryKind(e)];
  const done = isDone(e);
  const future = Date.parse(item.start_time) > now.getTime();
  const source = sourceLabel(item);
  const ended = isEndedSourceEntry(item, now);
  // Every action on a finished event or room answers the same thing and does nothing else.
  const blockEnded = () => notify("vcal.entry.endedToast");
  // A recurring entry is one row with many occurrences; completing it would
  // complete the whole series, so only one-off entries get the button.
  // VTID-04357: work-lens items are finished where they live, not here.
  const canComplete = !done && item.occurrence_index === null && !item.work && !!onComplete;
  // The gateway decides (`movable`): own one-off entries only, never a
  // booking, lab order or series — their source would move them back.
  const canMove = item.movable === true && !done && !item.work && !!onMove;
  const [picking, setPicking] = useState(false);
  const [when, setWhen] = useState(() => toLocalInput(new Date(item.start_time)));
  const picked = when ? new Date(when) : null;
  const pickedValid = !!picked && !Number.isNaN(picked.getTime()) && picked.getTime() !== Date.parse(item.start_time);
  const canEdit = canEditEntry(item) && !!onEdit;
  const canRemove = canRemoveEntry(item) && !!onRemove;
  const sourceAction = onOpenSource ? sourceActionOf(item, now) : null;
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const sharedPostId = item.shared_post_id ?? null;
  const canShare = item.shareable === true && !sharedPostId && !item.busy && !item.work && !!onShare;
  const [draft, setDraft] = useState(() => ({
    title: e.title,
    start: toLocalInput(new Date(item.start_time)),
    end: item.end_time ? toLocalInput(new Date(item.end_time)) : "",
    location: e.location ?? "",
    description: e.description ?? "",
  }));
  const draftStart = draft.start ? new Date(draft.start) : null;
  const draftEnd = draft.end ? new Date(draft.end) : null;
  const draftValid =
    draft.title.trim().length > 0 &&
    !!draftStart &&
    !Number.isNaN(draftStart.getTime()) &&
    (!draftEnd || (!Number.isNaN(draftEnd.getTime()) && draftEnd.getTime() > draftStart.getTime()));
  const saveEdit = () => {
    if (!draftValid || !draftStart) return;
    onEdit!(item, {
      title: draft.title.trim(),
      start_time: draftStart.toISOString(),
      end_time: draftEnd ? draftEnd.toISOString() : null,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
    });
  };

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
      aria-label={entryTitle(e)}
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto"
      style={{ background: SURFACE.page, color: SURFACE.ink }}
      data-testid="vcal-entry-screen"
    >
      <header className="flex flex-col gap-3.5 rounded-b-[36px] px-[22px] pb-7 pt-5 text-white" style={{ background: style.accent }}>
        <div className="flex items-center justify-between gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("vcal.entry.close")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>
          {source && (
            <span className="truncate rounded-full bg-white/20 px-3 py-1.5 text-xs">{source}</span>
          )}
        </div>
        <div aria-hidden className="text-7xl leading-none">
          {itemEmoji(item)}
        </div>
        <h1 className="m-0 text-xl font-bold leading-tight tracking-tight">
          {entryTitle(e)}
        </h1>
        <div className="flex flex-col gap-1 text-base">
          <span>📅 {fmtDate(item.start_time, { weekday: "long", day: "numeric", month: "long" })}</span>
          <span>
            🕗 {timeRange(item.start_time, item.end_time)}
            {e.location ? ` · ${e.location}` : ""}
          </span>
          {e.rrule && <span>🔁 {t("vcal.recurring")}</span>}
        </div>
        {done ? (
          <span className="self-start rounded-full bg-white px-3.5 py-2 text-sm" style={{ color: style.ink }}>
            ✅ {t("vcal.done")}
          </span>
        ) : ended ? (
          <span className="self-start rounded-full bg-white px-3.5 py-2 text-sm" style={{ color: style.ink }} data-testid="vcal-ended-chip">
            ⌛ {t("vcal.entry.endedChip")}
          </span>
        ) : future ? (
          <span className="self-start rounded-full bg-white px-3.5 py-2 text-sm" style={{ color: style.ink }}>
            ⏳ {relativeIn(item.start_time, now)}
          </span>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-5 px-[22px] py-5">
        {item.work && (
          <p className="m-0 rounded-2xl px-4 py-3 text-sm" style={{ background: style.bg, color: style.ink }} data-testid="vcal-work-note">
            {t("vcal.work.readOnly")}
          </p>
        )}

        {e.description && (
          <section className="flex flex-col gap-1.5">
            <h2 className="text-xs" style={{ color: SURFACE.muted }}>
              {t("vcal.entry.about")}
            </h2>
            <p className="m-0 whitespace-pre-line text-base leading-relaxed">{e.description}</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-xs" style={{ color: SURFACE.muted }}>
            {t("vcal.entry.reminders")}
          </h2>
          <div className="flex flex-wrap gap-2" data-testid="vcal-reminders">
            {item.reminders?.length ? (
              item.reminders.map((r, i) => (
                <span key={i} className="rounded-full px-3.5 py-2 text-sm" style={{ background: style.bg, color: style.ink }}>
                  🔔 {reminderLabel(r)}
                </span>
              ))
            ) : (
              <span className="text-sm" style={{ color: SURFACE.muted }}>
                {t("vcal.entry.noReminders")}
              </span>
            )}
          </div>
        </section>
      </div>

      {/* pb clears the app-wide Vitana orb button that floats bottom-centre on phones */}
      <footer className="flex flex-col gap-2.5 px-[22px] pb-28 md:pb-7">
        {ended && (
          <p className="m-0 rounded-2xl px-4 py-3 text-sm" style={{ background: style.bg, color: style.ink }} role="status" data-testid="vcal-ended-notice">
            {t("vcal.entry.endedNotice")}
          </p>
        )}
        {canComplete && (
          <button
            type="button"
            disabled={completing}
            aria-disabled={ended || undefined}
            onClick={() => (ended ? blockEnded() : onComplete!(item))}
            className={`h-14 rounded-[18px] text-lg font-semibold text-white disabled:opacity-60 ${ended ? "opacity-50" : ""}`}
            style={{ background: style.accent }}
            data-testid="vcal-complete"
          >
            ✅ {t("vcal.markDone")}
          </button>
        )}
        {canMove && picking && (
          <div className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: style.bg }} data-testid="vcal-move-picker">
            <label htmlFor="vcal-move-when" className="text-xs" style={{ color: style.ink }}>
              {t("vcal.move.title")}
            </label>
            <input
              id="vcal-move-when"
              type="datetime-local"
              value={when}
              onChange={(ev) => setWhen(ev.target.value)}
              className="h-12 w-full rounded-2xl bg-white px-3 text-base"
            />
            <span className="text-sm" style={{ color: style.ink }}>
              {t("vcal.move.keepsLength")}
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="h-12 rounded-2xl text-sm"
                style={{ background: SURFACE.track }}
              >
                {t("vcal.move.cancel")}
              </button>
              <button
                type="button"
                disabled={!pickedValid || moving}
                onClick={() => picked && onMove!(item, picked)}
                className="h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: style.accent }}
                data-testid="vcal-move-confirm"
              >
                {t("vcal.move.confirm")}
              </button>
            </div>
          </div>
        )}
        {canMove && !picking && (
          <button
            type="button"
            aria-disabled={ended || undefined}
            onClick={() => (ended ? blockEnded() : setPicking(true))}
            className={`h-[52px] rounded-2xl text-sm ${ended ? "opacity-50" : ""}`}
            style={{ background: SURFACE.track }}
            data-testid="vcal-move"
          >
            🗓️ {t("vcal.move.action")}
          </button>
        )}
        {sourceAction && (
          <button
            type="button"
            aria-disabled={ended || undefined}
            onClick={() => (ended ? blockEnded() : onOpenSource!(sourceAction.path))}
            // Only a room you can join right now is the main action; going to
            // the event or the room page sits with the other secondary actions.
            className={
              sourceAction.kind === "live_room" && sourceAction.joinable
                ? "h-14 rounded-[18px] text-lg font-semibold text-white"
                : `h-[52px] rounded-2xl text-sm ${ended ? "opacity-50" : ""}`
            }
            style={{ background: sourceAction.kind === "live_room" && sourceAction.joinable ? style.accent : SURFACE.track }}
            data-testid="vcal-open-source"
          >
            {sourceAction.kind === "event"
              ? `🎟️ ${t("vcal.entry.openEvent")}`
              : sourceAction.joinable
                ? `🎥 ${t("vcal.entry.joinRoom")}`
                : `🎥 ${t("vcal.entry.openRoom")}`}
          </button>
        )}
        {canShare && sharingOpen && (
          <ShareToFeedPanel
            item={item}
            accent={style.accent}
            bg={style.bg}
            ink={style.ink}
            sharing={sharing}
            onCancel={() => setSharingOpen(false)}
            onShare={(input) => onShare!(item, input)}
          />
        )}
        {canShare && !sharingOpen && (
          <button
            type="button"
            onClick={() => setSharingOpen(true)}
            className="h-[52px] rounded-2xl text-sm"
            style={{ background: SURFACE.track }}
            data-testid="vcal-share"
          >
            📣 {t("vcal.share.action")}
          </button>
        )}
        {sharedPostId && onOpenSource && (
          <button
            type="button"
            onClick={() => onOpenSource(`/post/post/${encodeURIComponent(sharedPostId)}`)}
            className="h-[52px] rounded-2xl text-sm"
            style={{ background: SURFACE.track }}
            data-testid="vcal-shared-post"
          >
            📣 {t("vcal.share.viewPost")}
          </button>
        )}
        {canEdit && editing && (
          <div className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: style.bg }} data-testid="vcal-edit-form">
            <label className="flex flex-col gap-1 text-xs" style={{ color: style.ink }}>
              {t("vcal.edit.titleLabel")}
              <input
                value={draft.title}
                onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
                className="h-12 w-full rounded-2xl bg-white px-3 text-base text-slate-900"
                data-testid="vcal-edit-title"
              />
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs" style={{ color: style.ink }}>
                {t("vcal.edit.startLabel")}
                <input
                  type="datetime-local"
                  value={draft.start}
                  onChange={(ev) => setDraft((d) => ({ ...d, start: ev.target.value }))}
                  className="h-12 w-full rounded-2xl bg-white px-3 text-base text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: style.ink }}>
                {t("vcal.edit.endLabel")}
                <input
                  type="datetime-local"
                  value={draft.end}
                  onChange={(ev) => setDraft((d) => ({ ...d, end: ev.target.value }))}
                  className="h-12 w-full rounded-2xl bg-white px-3 text-base text-slate-900"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs" style={{ color: style.ink }}>
              {t("vcal.edit.locationLabel")}
              <input
                value={draft.location}
                onChange={(ev) => setDraft((d) => ({ ...d, location: ev.target.value }))}
                className="h-12 w-full rounded-2xl bg-white px-3 text-base text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: style.ink }}>
              {t("vcal.edit.descriptionLabel")}
              <textarea
                value={draft.description}
                onChange={(ev) => setDraft((d) => ({ ...d, description: ev.target.value }))}
                rows={3}
                className="w-full rounded-2xl bg-white px-3 py-2 text-base text-slate-900"
              />
            </label>
            {!draftValid && (
              <span className="text-sm" style={{ color: style.ink }} role="alert">
                {t("vcal.edit.invalid")}
              </span>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setEditing(false)} className="h-12 rounded-2xl text-sm" style={{ background: SURFACE.track }}>
                {t("vcal.edit.cancel")}
              </button>
              <button
                type="button"
                disabled={!draftValid || saving}
                onClick={saveEdit}
                className="h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: style.accent }}
                data-testid="vcal-edit-save"
              >
                {t("vcal.edit.save")}
              </button>
            </div>
          </div>
        )}
        {(canEdit || canRemove) && !editing && !confirmRemove && (
          <div className="grid grid-cols-2 gap-2.5">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`h-[52px] rounded-2xl text-sm ${canRemove ? "" : "col-span-2"}`}
                style={{ background: SURFACE.track }}
                data-testid="vcal-edit"
              >
                ✏️ {t("vcal.edit.action")}
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className={`h-[52px] rounded-2xl text-sm ${canEdit ? "" : "col-span-2"}`}
                style={{ background: SURFACE.track }}
                data-testid="vcal-remove"
              >
                🗑️ {t("vcal.remove.action")}
              </button>
            )}
          </div>
        )}
        {canRemove && confirmRemove && (
          <div className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: style.bg }} data-testid="vcal-remove-confirm">
            <span className="text-sm" style={{ color: style.ink }}>
              {e.rrule ? t("vcal.remove.confirmSeries") : t("vcal.remove.confirm")}
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConfirmRemove(false)} className="h-12 rounded-2xl text-sm" style={{ background: SURFACE.track }}>
                {t("vcal.remove.keep")}
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => onRemove!(item)}
                className="h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: style.accent }}
                data-testid="vcal-remove-yes"
              >
                {t("vcal.remove.yes")}
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {e.location && (
            <button type="button" onClick={openDirections} className="h-[52px] rounded-2xl text-sm" style={{ background: SURFACE.track }}>
              🗺️ {t("vcal.entry.directions")}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              activateOrbGuide({
                feature: "calendar_entry",
                state: entryTimeState(item, now),
                kind: sourceActionOf(item, now)?.kind ?? (e.source_type || "other"),
                title: entryTitle(e),
              })
            }
            className={`h-[52px] rounded-2xl text-sm ${e.location ? "" : "col-span-2"}`}
            style={{ background: SURFACE.track }}
          >
            🎙️ {t("vcal.entry.askVitana")}
          </button>
        </div>
      </footer>
    </div>
  );
}
