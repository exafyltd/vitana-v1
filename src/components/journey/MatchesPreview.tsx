import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ChevronRight, Loader2 } from "lucide-react";
import { useRealMatches } from "@/hooks/useRealMatches";
import { t } from "@/lib/i18n-toast";
import { localizeMatchReason } from "@/lib/matchReason";

/**
 * Compact Matches preview for My Journey. Shows real "people who match you"
 * from the daily-matches engine (see useRealMatches) — no demo/mock profiles.
 */
export function MatchesPreview({ limit = 3 }: { limit?: number }) {
  const navigate = useNavigate();
  const { data: matches, isLoading } = useRealMatches(limit);

  const list = (matches ?? []).slice(0, limit);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Card className="rounded-2xl border border-pink-200/60 bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 shadow-sm dark:from-pink-950/20 dark:via-fuchsia-950/20 dark:to-purple-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-pink-900 dark:text-pink-100">
            <Heart className="w-4 h-4 text-pink-500" />
            {t("screens.autopilotdashboard.matchesTitle")}
          </h3>
          <button
            type="button"
            onClick={() => navigate("/me/matches")}
            className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 hover:underline flex items-center gap-0.5"
          >
            {t("screens.autopilotdashboard.matchesSeeAll")}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            {t("screens.autopilotdashboard.matchesEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((m) => (
              <li key={m.user_id}>
                <button
                  type="button"
                  onClick={() => navigate(`/u/${m.user_id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-pink-200/40 text-left hover:bg-white dark:hover:bg-white/10 transition-colors"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm shrink-0">
                    <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white text-xs font-semibold">
                      {initials(m.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {localizeMatchReason(m.match_reason) ||
                        t("screens.autopilotdashboard.matchReasonDefault")}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-sm shrink-0">
                    {m.compatibility_score}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
