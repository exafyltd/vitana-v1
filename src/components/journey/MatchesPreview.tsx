import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { t } from "@/lib/i18n-toast";

interface MatchPreviewItem {
  user_id: string;
  display_name: string;
  avatar_url: string;
  match_reason: string;
  compatibility_score: number;
}

/**
 * Compact 3-row Matches preview for My Journey. Tries the
 * generate-recommendations edge function, falls back to demo data — same
 * tiered approach as PeopleMatchCard but rendered as a slim preview.
 */
export function MatchesPreview({ limit = 3 }: { limit?: number }) {
  const navigate = useNavigate();
  const { people: demoPeople } = useDemoMatches();
  const [items, setItems] = useState<MatchPreviewItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-recommendations", {
          body: { type: "people", limit },
        });
        if (!cancelled && !error && data?.recommendations?.length) {
          setItems(data.recommendations.slice(0, limit));
          return;
        }
      } catch {
        // fall through to demo
      }
      if (!cancelled) {
        setItems(
          demoPeople.slice(0, limit).map((p) => ({
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            match_reason: p.match_reason,
            compatibility_score: p.compatibility_score,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoPeople, limit]);

  const list = items ?? [];

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
            onClick={() => navigate("/comm/find-partner?view=matches")}
            className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 hover:underline flex items-center gap-0.5"
          >
            {t("screens.autopilotdashboard.matchesSeeAll")}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            {t("screens.autopilotdashboard.matchesEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-3 p-2 rounded-xl bg-white/70 dark:bg-white/5 border border-pink-200/40"
              >
                <img
                  src={m.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.match_reason}</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-sm shrink-0">
                  {m.compatibility_score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
