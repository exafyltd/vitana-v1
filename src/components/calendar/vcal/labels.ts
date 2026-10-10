/**
 * VTID-04351 — non-component helpers shared by the calendar views.
 */
import { t } from "@/lib/i18n-toast";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { KIND_STYLE, entryKind } from "./theme";
import { sameDay } from "./time";

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
    case "reminder":
      return t("vcal.source.reminder");
    case "subscription":
      return t("vcal.source.subscription");
    case "test_result":
      return t("vcal.source.testResult");
    default:
      return null;
  }
}

/**
 * VTID-04994: entries the system writes from a member's subscription carry an
 * English fallback title in the database; the app shows the localised one,
 * chosen by metadata.kind. Everything else shows its own title.
 */
export function entryTitle(e: { title?: string | null; source_type?: string | null; metadata?: Record<string, unknown> | null }): string {
  if (e.source_type === "subscription") {
    switch (e.metadata?.kind) {
      case "renews":
        return t("vcal.subscription.renews");
      case "ends":
        return t("vcal.subscription.ends");
      case "trial_ends":
        return t("vcal.subscription.trialEnds");
    }
  }
  return e.title ?? "";
}

export function itemEmoji(item: CalendarWindowItem): string {
  if (!item.event) return "";
  return item.display_emoji || item.event.emoji || KIND_STYLE[entryKind(item.event)].emoji;
}

export function itemsOn(items: CalendarWindowItem[], day: Date): CalendarWindowItem[] {
  return items.filter((i) => sameDay(new Date(i.start_time), day));
}
