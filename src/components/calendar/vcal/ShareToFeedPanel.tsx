/**
 * VTID-04916 — tell the community you are going: the entry screen's
 * "share to the feed" panel. Prefilled with a short line about the event the
 * member can change, and a switch between everyone and only their profile.
 * The feed shows the event as a live card under the text, so the text never
 * has to carry the date or the place.
 */
import { useState } from "react";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import type { CalendarWindowItem, ShareToFeedInput } from "@/lib/calendar-window-client";
import { SURFACE } from "./theme";

const TEXT_MAX = 2000;

interface Props {
  item: CalendarWindowItem;
  accent: string;
  bg: string;
  ink: string;
  sharing?: boolean;
  onCancel: () => void;
  onShare: (input: ShareToFeedInput) => void;
}

export function defaultShareText(item: CalendarWindowItem): string {
  return t("vcal.share.defaultText", {
    title: item.event?.title ?? "",
    date: fmtDate(item.start_time, { weekday: "long", day: "numeric", month: "long" }),
  });
}

export function ShareToFeedPanel({ item, accent, bg, ink, sharing, onCancel, onShare }: Props) {
  const [text, setText] = useState(() => defaultShareText(item));
  const [isPublic, setIsPublic] = useState(true);
  const tooLong = text.length > TEXT_MAX;

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] p-4" style={{ background: bg }} data-testid="vcal-share-panel">
      <label className="flex flex-col gap-1 text-xs" style={{ color: ink }}>
        {t("vcal.share.textLabel")}
        <textarea
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          rows={3}
          maxLength={TEXT_MAX}
          className="w-full rounded-2xl bg-white px-3 py-2 text-base text-slate-900"
          data-testid="vcal-share-text"
        />
      </label>
      <span className="text-sm" style={{ color: ink }}>
        {t("vcal.share.cardHint")}
      </span>
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
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onCancel} className="h-12 rounded-2xl text-sm" style={{ background: SURFACE.track }}>
          {t("vcal.share.cancel")}
        </button>
        <button
          type="button"
          disabled={sharing || tooLong}
          onClick={() => onShare({ text: text.trim(), is_public: isPublic })}
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
