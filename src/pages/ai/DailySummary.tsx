import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import { useVitanaIndexHistory } from "@/hooks/useVitanaIndexHistory";
import { fetchDailyLearnings } from "@/lib/memory-api";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

/**
 * VTID-04391: the Daily summary shows what Vitana learned each day — the
 * `daily_learning` notes written from the user's diary, conversations and
 * newly learned facts — and the real latest Vitana Index. It replaced a
 * mock that rendered a fixed score of 72.
 */
export default function DailySummary() {
  const navigate = useNavigate();
  const { history } = useVitanaIndexHistory(7);
  const latestScore = history.length ? history[history.length - 1].score : null;
  const { data: learnings, isLoading } = useQuery({
    queryKey: ["daily-learnings"],
    queryFn: () => fetchDailyLearnings(14),
    staleTime: 5 * 60_000,
  });

  return (
    <AppLayout>
      <SEO title={t('screens.ai.dailySummaryAiIntelligence')} description="AI-generated daily wellness summary" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.ai.dailySummary')}</h1>
              <p className="text-muted-foreground">{t('screens.ai.yourComprehensiveDailyWellnessRecapTomorrow')}</p>
            </div>

            <button
              type="button"
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
              aria-label={t('screens.ai.dailySummaryOpenIndex')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">{latestScore ?? '–'}</span>
                </div>
              </div>
            </button>
          </div>

          <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('screens.ai.dailyLearningsTitle')}
            </h2>
            {isLoading ? (
              <p className="text-muted-foreground">{t('screens.ai.dailyLearningsLoading')}</p>
            ) : !learnings || learnings.length === 0 ? (
              <p className="text-muted-foreground">{t('screens.ai.dailyLearningsEmpty')}</p>
            ) : (
              <ul className="space-y-4">
                {learnings.map((l) => (
                  <li key={l.id} className="border-s-2 border-primary/40 ps-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      {fmtDate(new Date(`${l.date}T12:00:00`), { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <p className="text-foreground mt-1">{l.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
