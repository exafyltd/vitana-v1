/**
 * VTID-04996: "Find a time" in the add form. The member asks; the gateway
 * answers with up to three free slots for the length they set, over everything
 * the calendar shows (other calendars included) and inside their waking hours.
 * Picking one fills the date and times; nothing is saved until they save.
 */
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { fetchFreeSlots, type FreeSlot } from "@/lib/calendar-window-client";
import { fmtDate, fmtTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

interface Props {
  durationMin: number;
  role: string | null;
  onPick: (start: Date, end: Date) => void;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function FindTime({ durationMin, role, onPick }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [slots, setSlots] = useState<FreeSlot[]>([]);

  const ask = () => {
    setState("loading");
    fetchFreeSlots(durationMin, role)
      .then((r) => {
        // The form holds one date; a slot that runs past midnight cannot be filled in.
        setSlots(r.filter((s) => sameLocalDay(new Date(s.start), new Date(s.end))));
        setState("done");
      })
      .catch(() => setState("error"));
  };

  return (
    <div className="space-y-2" data-testid="vcal-find-time">
      <button
        type="button"
        onClick={ask}
        disabled={state === "loading"}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-medium disabled:opacity-60"
        data-testid="vcal-find-time-ask"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("vcal.findTime.action")}
      </button>
      {state === "loading" && <p className="m-0 text-sm text-muted-foreground" role="status">{t("vcal.findTime.loading")}</p>}
      {state === "error" && <p className="m-0 text-sm text-muted-foreground" role="status">{t("vcal.findTime.error")}</p>}
      {state === "done" && slots.length === 0 && (
        <p className="m-0 text-sm text-muted-foreground" role="status">{t("vcal.findTime.none")}</p>
      )}
      {state === "done" && slots.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t("vcal.findTime.pick")}>
          {slots.map((s) => {
            const start = new Date(s.start);
            const end = new Date(s.end);
            return (
              <li key={s.start}>
                <button
                  type="button"
                  onClick={() => onPick(start, end)}
                  className="h-11 rounded-full border border-input bg-background px-4 text-sm"
                  data-testid="vcal-find-time-slot"
                >
                  {fmtDate(start, { weekday: "short", day: "numeric", month: "short" })}{" · "}
                  {fmtTime(start, { hour: "2-digit", minute: "2-digit" })}–{fmtTime(end, { hour: "2-digit", minute: "2-digit" })}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
