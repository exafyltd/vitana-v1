/**
 * Full "People who match you" list — the "See all" destination for the
 * MatchesPreview card on My Journey. Driven by the SAME useRealMatches hook
 * as the preview, so the two can never disagree (the previous target,
 * /comm/find-partner, used an unrelated wish-based system and showed an
 * empty state, which mismatched the preview's real matches).
 */
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import SEO from "@/components/SEO";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MapPin } from "lucide-react";
import { useRealMatches } from "@/hooks/useRealMatches";
import { t } from "@/lib/i18n-toast";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const { data: matches, isLoading } = useRealMatches(50);
  const list = matches ?? [];

  return (
    <>
      <SEO
        title={t("screens.autopilotdashboard.matchesTitle")}
        description={t("screens.autopilotdashboard.matchesPageDescription")}
      />
      <AppLayout>
        <div className="p-4 md:p-6 bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 dark:from-pink-950/20 dark:via-fuchsia-950/20 dark:to-purple-950/20 min-h-screen">
          <div className="max-w-2xl mx-auto">
            <StandardHeader
              title={t("screens.autopilotdashboard.matchesTitle")}
              description={t("screens.autopilotdashboard.matchesPageDescription")}
            />

            <div className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-pink-200/40 bg-white/60 dark:bg-white/5"
                    >
                      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Heart className="h-10 w-10 text-pink-400 mb-3 mx-auto" />
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {t("screens.autopilotdashboard.matchesEmpty")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {list.map((m) => (
                    <li key={m.user_id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/u/${m.user_id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-pink-200/50 text-left hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm"
                      >
                        <Avatar className="w-12 h-12 ring-2 ring-white shadow-sm shrink-0">
                          <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white text-sm font-semibold">
                            {initials(m.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{m.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.match_reason ||
                              t("screens.autopilotdashboard.matchReasonDefault")}
                          </p>
                          {m.location && (
                            <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {m.location}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-sm shrink-0">
                          {m.compatibility_score}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
