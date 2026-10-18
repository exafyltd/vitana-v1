import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ChevronRight, Loader2 } from "lucide-react";
import { useRealMatches } from "@/hooks/useRealMatches";
import { useMarkMatchesViewed } from "@/hooks/useMarkMatchesViewed";
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
  // VTID-04827: these cards are on screen — record that the member saw them.
  useMarkMatchesViewed(list.map((m) => m.user_id));

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Card className="rounded-2xl border border-category-4/15 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-category-4">
            <Heart className="w-4 h-4 text-category-4" />
            {t("screens.autopilotdashboard.matchesTitle")}
          </h3>
          <button
            type="button"
            onClick={() => navigate("/me/matches")}
            className="text-xs font-semibold text-category-4 hover:underline flex items-center gap-0.5"
          >
            {t("screens.autopilotdashboard.matchesSeeAll")}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-category-4" />
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
                  className="w-full flex items-center gap-3 p-2 rounded-xl bg-card/70 border border-category-4/10 text-start hover:bg-card transition-colors"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-border shadow-sm shrink-0">
                    <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-gradient-to-br from-category-4/80 to-category-4 text-primary-foreground text-xs font-semibold">
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
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-category-4 to-category-4 text-primary-foreground shadow-sm shrink-0">
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
