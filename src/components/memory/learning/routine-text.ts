/**
 * VTID-05172 — one sentence per routine, in the member's language, from its
 * kind + metadata (the gateway never sends the English title/summary).
 */
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { t } from "@/lib/i18n-toast";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import type { Routine } from "@/lib/memory-learning-api";

const BUCKETS = new Set(["morning", "midday", "afternoon", "evening", "night"]);
const PILLARS = new Set(["nutrition", "hydration", "exercise", "sleep", "mental"]);

function bucket(v: unknown): string | null {
  return typeof v === "string" && BUCKETS.has(v) ? t(`memoryLearning.bucket.${v}`) : null;
}

/** Weekday name for 0 = Sunday … 6 = Saturday (4 Jan 2026 was a Sunday). */
function weekday(i: number): string {
  return fmtDate(new Date(2026, 0, 4 + i, 12), { weekday: "long" });
}

export function routineSentence(r: Routine): string {
  const m = r.metadata ?? {};
  switch (r.routine_kind) {
    case "screen_habit":
      if (typeof m.path === "string" && typeof m.days === "number") return t("memoryLearning.routine.screen_habit", { screen: m.path, days: fmtNumber(m.days) });
      break;
    case "active_hours": {
      const b = bucket(m.bucket);
      if (b) return t("memoryLearning.routine.active_hours", { bucket: b });
      break;
    }
    case "feature_affinity":
      if (typeof m.category === "string") return t("memoryLearning.routine.feature_affinity", { area: t(`timeline.category.${m.category}`) });
      break;
    case "pillar_rhythm": {
      const b = bucket(m.bucket);
      if (typeof m.pillar === "string" && PILLARS.has(m.pillar) && b && typeof m.days_per_week === "number") {
        return t("memoryLearning.routine.pillar_rhythm", {
          pillar: pillarLabel(m.pillar as never),
          bucket: b,
          n: fmtNumber(Math.max(1, Math.round(m.days_per_week))),
        });
      }
      break;
    }
    case "time_of_day_preference": {
      const b = bucket(m.time_of_day);
      if (b) return t("memoryLearning.routine.time_of_day_preference", { bucket: b });
      break;
    }
    case "day_of_week_rhythm":
      if (typeof m.dow_index === "number" && m.dow_index >= 0 && m.dow_index <= 6) return t("memoryLearning.routine.day_of_week_rhythm", { day: weekday(m.dow_index) });
      break;
    case "category_affinity":
      if (typeof m.tag === "string" && m.tag.trim()) return t("memoryLearning.routine.category_affinity", { tag: m.tag.trim().slice(0, 40) });
      break;
  }
  return t("memoryLearning.routine.generic");
}
