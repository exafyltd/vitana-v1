/**
 * VTID-04916 — tell the community you are going: the entry screen's
 * "share to the feed" panel. Prefilled with a short line about the event the
 * member can change, and a switch between everyone and only their profile.
 * The feed shows the event as a live card under the text, so the text never
 * has to carry the date or the place.
 *
 * VTID-05126 — any of the member's own upcoming entries can be shared. For an
 * own entry (not a community event or live room) the member also chooses
 * what others see on the card: its title (a reminder such as "Erinnerung:
 * Geburtstag von Maria Maksina" can become "Marias Geburtstag") and whether
 * the place is shown (off by default). A health entry carries a short hint.
 * A preview shows exactly the card others will see.
 */
import { useState } from "react";
import { t } from "@/lib/i18n-toast";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import type { CalendarWindowItem, ShareToFeedInput } from "@/lib/calendar-window-client";
import { isOwnEntryShare } from "./entry-actions";
import { entryTitle } from "./labels";
import { SURFACE } from "./theme";

const TEXT_MAX = 2000;
export const CARD_TITLE_MAX = 120;

interface Props {
  item: CalendarWindowItem;
  accent: string;
  bg: string;
  ink: string;
  sharing?: boolean;
  onCancel: () => void;
  onShare: (input: ShareToFeedInput) => void;
}

function shareDate(item: CalendarWindowItem): string {
  return fmtDate(item.start_time, { weekday: "long", day: "numeric", month: "long" });
}

export function defaultShareText(item: CalendarWindowItem): string {
  return t("vcal.share.defaultText", {
    title: item.event?.title ?? "",
    date: shareDate(item),
  });
}

/** VTID-05126: the prefilled line for an own entry names the card title, never the private calendar title. */
export function defaultOwnShareText(item: CalendarWindowItem, cardTitle: string): string {
  return t("vcal.share.defaultTextOwn", { title: cardTitle, date: shareDate(item) });
}

export function ShareToFeedPanel({ item, accent, bg, ink, sharing, onCancel, onShare }: Props) {
  const own = isOwnEntryShare(item);
  const entryName = item.event ? entryTitle(item.event) : "";
  const place = (item.event?.location ?? "").trim();
  const [cardTitle, setCardTitle] = useState(entryName);
  const [showPlace, setShowPlace] = useState(false);
  // A health entry starts with no line of ours ("Who's in?" does not fit); the card speaks.
  const sensitive = item.sensitive === true;
  const [text, setText] = useState(() => (own ? (sensitive ? "" : defaultOwnShareText(item, entryName)) : defaultShareText(item)));
  const [textTouched, setTextTouched] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const tooLong = text.length > TEXT_MAX;
  const shownTitle = cardTitle.trim() || entryName;

  const changeTitle = (value: string) => {
    setCardTitle(value);
    // The prefilled line follows the card title until the member writes their own.
    if (!textTouched && !sensitive) setText(defaultOwnShareText(item, value.trim() || entryName));
  };

  const submit = () => {
    const input: ShareToFeedInput = { text: text.trim(), is_public: isPublic };
    if (own) {
      // Always the title the preview shows (the calendar may display a localized name).
      input.card_title = shownTitle;
      input.include_location = showPlace;
    }
    onShare(input);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: bg }} data-testid="vcal-share-panel">
      {own && (
        <label className="flex flex-col gap-1 text-xs" style={{ color: ink }}>
          {t("vcal.share.cardTitleLabel")}
          <input
            value={cardTitle}
            onChange={(ev) => changeTitle(ev.target.value)}
            maxLength={CARD_TITLE_MAX}
            className="h-12 w-full rounded-2xl bg-white px-3 text-base text-slate-900"
            data-testid="vcal-share-card-title"
          />
          {cardTitle.trim() !== entryName && (
            <span className="text-xs" style={{ color: ink }} data-testid="vcal-share-calendar-title">
              {t("vcal.share.calendarTitle", { title: entryName })}
            </span>
          )}
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs" style={{ color: ink }}>
        {t("vcal.share.textLabel")}
        <textarea
          value={text}
          onChange={(ev) => {
            setText(ev.target.value);
            setTextTouched(true);
          }}
          rows={3}
          maxLength={TEXT_MAX}
          className="w-full rounded-2xl bg-white px-3 py-2 text-base text-slate-900"
          data-testid="vcal-share-text"
        />
      </label>
      {own && place && (
        <label className="flex items-center gap-3 text-sm" style={{ color: ink }}>
          <input
            type="checkbox"
            checked={showPlace}
            onChange={(ev) => setShowPlace(ev.target.checked)}
            className="h-5 w-5 shrink-0"
            data-testid="vcal-share-location"
          />
          <span>{showPlace ? t("vcal.share.placeShown", { place }) : t("vcal.share.placeHidden")}</span>
        </label>
      )}
      <label className="flex items-center gap-3 text-sm" style={{ color: ink }}>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(ev) => setIsPublic(ev.target.checked)}
          className="h-5 w-5 shrink-0"
          data-testid="vcal-share-public"
        />
        <span>{isPublic ? t("vcal.share.public") : t("vcal.share.profileOnly")}</span>
      </label>
      {own ? (
        <div className="flex flex-col gap-1" data-testid="vcal-share-preview">
          <span className="text-xs" style={{ color: ink }}>
            {t("vcal.share.previewLabel")}
          </span>
          <div className="flex flex-col rounded-2xl bg-white px-3 py-2 text-slate-900">
            <span className="break-words text-base font-semibold">{shownTitle}</span>
            <span className="text-sm text-slate-600">
              {fmtDate(item.start_time, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
              {fmtTime(item.start_time, { hour: "2-digit", minute: "2-digit" })}
              {showPlace && place ? ` · ${place}` : ""}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-sm" style={{ color: ink }}>
          {t("vcal.share.cardHint")}
        </span>
      )}
      {item.sensitive && (
        <p role="note" className="m-0 rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-900" data-testid="vcal-share-sensitive">
          {t("vcal.share.sensitiveHint")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onCancel} className="h-12 rounded-2xl text-sm" style={{ background: SURFACE.track }}>
          {t("vcal.share.cancel")}
        </button>
        <button
          type="button"
          disabled={sharing || tooLong}
          onClick={submit}
          className="h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: accent }}
          data-testid="vcal-share-post"
        >
          {t("vcal.share.post")}
        </button>
      </div>
    </div>
  );
}
