import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronRight } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { fmtTime, formatDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

interface EventPreviewItem {
  id: string;
  title: string;
  start_time: string;
  participant_count: number;
  online: boolean;
  image_url?: string | null;
}

const GRADIENTS = [
  "bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-500",
  "bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-500",
];

/**
 * Compact 2-card "look forward to" preview for My Journey. Pulls real
 * community events (today + upcoming) with a demo-data fallback.
 */
export function EventsPreview({ limit = 2 }: { limit?: number }) {
  const navigate = useNavigate();
  const { todayEvents, upcomingEvents } = useCommunityEvents();
  const { events: demoEvents } = useDemoMatches();

  const items = useMemo<EventPreviewItem[]>(() => {
    const real = [...(todayEvents ?? []), ...(upcomingEvents ?? [])]
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        participant_count: e.participant_count,
        online: !!e.virtual_link,
        image_url: e.image_url,
      }));
    if (real.length > 0) return real;
    return demoEvents.slice(0, limit).map((e) => ({
      id: e.id,
      title: e.title,
      start_time: e.start_time,
      participant_count: e.participant_count,
      online: e.event_type === "Mental" || e.event_type === "Community",
      image_url: e.image_url,
    }));
  }, [todayEvents, upcomingEvents, demoEvents, limit]);

  return (
    <Card className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-sm dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-orange-900 dark:text-orange-100">
            <Sparkles className="w-4 h-4 text-orange-500" />
            {t("screens.autopilotdashboard.eventsTitle")}
          </h3>
          <button
            type="button"
            onClick={() => navigate("/community/events")}
            className="text-xs font-semibold text-orange-700 dark:text-orange-300 hover:underline flex items-center gap-0.5"
          >
            {t("screens.autopilotdashboard.eventsSeeAll")}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            {t("screens.autopilotdashboard.eventsEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/community/events?event=${e.id}`)}
                className="text-left rounded-xl overflow-hidden bg-white/70 dark:bg-white/5 border border-amber-200/40 hover:shadow-md transition-shadow"
              >
                <div className={`h-20 relative ${e.image_url ? "" : GRADIENTS[i % GRADIENTS.length]}`}>
                  {e.image_url && (
                    <img src={e.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute top-2 left-2 bg-white/95 dark:bg-black/70 rounded-md px-1.5 py-1 text-center leading-tight shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground">
                      {formatDate(e.start_time, "EEE")}
                    </div>
                    <div className="text-base font-serif font-semibold">
                      {formatDate(e.start_time, "d")}
                    </div>
                    <div className="text-[9px] uppercase font-semibold text-muted-foreground">
                      {formatDate(e.start_time, "MMM")}
                    </div>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold line-clamp-2 leading-snug">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {fmtTime(e.start_time, { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {e.online
                      ? t("screens.autopilotdashboard.eventsOnline")
                      : t("screens.autopilotdashboard.eventsAttending", { count: e.participant_count })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
