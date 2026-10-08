/**
 * VTID-04995: "this overlaps with …" under the time pickers. A warning, never a
 * block — the member decides. Other calendars and other roles show as busy time
 * (no title, by design).
 */
import type { CalendarConflict } from "@/lib/calendar-window-client";
import { fmtTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

function line(c: CalendarConflict): string {
  const range = `${fmtTime(new Date(c.start_time), { hour: "2-digit", minute: "2-digit" })}–${fmtTime(new Date(c.end_time ?? c.start_time), { hour: "2-digit", minute: "2-digit" })}`;
  if (c.kind === "own" && c.title) return t("vcal.overlap.own", { title: c.title, time: range });
  if (c.kind === "external") return t("vcal.overlap.external", { time: range });
  return t("vcal.overlap.busy", { time: range });
}

export function OverlapWarning({ conflicts }: { conflicts: CalendarConflict[] }) {
  if (!conflicts.length) return null;
  return (
    <div
      role="status"
      className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"
      data-testid="vcal-overlap"
    >
      <p className="m-0 font-semibold">{t("vcal.overlap.title")}</p>
      <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
        {conflicts.slice(0, 3).map((c, i) => (
          <li key={`${c.start_time}-${i}`}>{line(c)}</li>
        ))}
      </ul>
    </div>
  );
}
