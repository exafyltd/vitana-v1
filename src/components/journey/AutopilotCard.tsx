import { Card, CardContent } from "@/components/ui/card";
import { Plane, ChevronRight } from "lucide-react";
import type { AutopilotAction } from "@/types/autopilot";
import { t } from "@/lib/i18n-toast";

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

/**
 * Autopilot preview card for My Journey — shows the top 2-3 pending actions
 * so the user can glance at what Vitana wants to take off their plate.
 * Tapping anywhere opens the full Autopilot popup (queue + one-tap activate).
 */
export function AutopilotCard({
  pendingCount,
  previewActions,
  onOpen,
}: {
  pendingCount: number;
  previewActions: AutopilotAction[];
  onOpen: () => void;
}) {
  const hidden = Math.max(0, pendingCount - previewActions.length);

  return (
    <Card className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 dark:from-indigo-950/20 dark:via-violet-950/20 dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        aria-label={t("screens.autopilotdashboard.openAutopilot")}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0">
                <Plane className="w-3.5 h-3.5 text-white -rotate-12" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  {t("screens.autopilotdashboard.autopilotCardTitle")}
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 truncate">
                  {t("screens.autopilotdashboard.autopilotCardSubtitle")}
                </p>
              </div>
            </div>
            {pendingCount > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shrink-0">
                {pendingCount}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
          </div>

          {previewActions.length === 0 ? (
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 py-1">
              {t("screens.autopilotdashboard.planAllClear")} ✨
            </p>
          ) : (
            <ul className="space-y-1.5">
              {previewActions.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[a.priority] ?? "bg-slate-300"}`} />
                  <span className="truncate flex-1">{a.title}</span>
                  {a.timeEstimate && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{a.timeEstimate}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {hidden > 0 && (
            <div className="flex items-center justify-end gap-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 pt-1">
              {t("screens.autopilotdashboard.autopilotSeeAll", { count: hidden })}
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </CardContent>
      </button>
    </Card>
  );
}
