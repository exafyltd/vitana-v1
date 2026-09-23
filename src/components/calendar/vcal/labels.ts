/**
 * VTID-04351 — non-component helpers shared by the calendar views.
 */
import { t } from "@/lib/i18n-toast";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, entryKind } from "./theme";
import { sameDay } from "./time";

export const HEADING_FONT = "Fredoka, Nunito, system-ui, sans-serif";

export function sourceLabel(item: CalendarWindowItem): string | null {
  const e = item.event;
  if (!e) return null;
  if (item.work) return t(`vcal.work.${item.work.kind}`);
  if (e.source_ref_type === "lab_order" || e.source_type === "lab_order") return t("vcal.source.lab");
  switch (e.source_type) {
    case "autopilot":
    case "autopilot_recommendation":
      return t("vcal.source.autopilot");
    case "health_plan":
    case "goal_plan":
      return t("vcal.source.plan");
    case "assistant":
      return t("vcal.source.assistant");
    case "community_rsvp":
    case "live_room":
      return t("vcal.source.community");
    case "guided_journey":
      return t("vcal.source.journey");
    default:
      return null;
  }
}

export function itemEmoji(item: CalendarWindowItem): string {
  if (!item.event) return "";
  return item.display_emoji || item.event.emoji || KIND_STYLE[entryKind(item.event)].emoji;
}

export function itemsOn(items: CalendarWindowItem[], day: Date): CalendarWindowItem[] {
  return items.filter((i) => sameDay(new Date(i.start_time), day));
}
