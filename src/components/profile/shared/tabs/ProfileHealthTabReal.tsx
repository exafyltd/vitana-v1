/**
 * VTID-04483 — the profile Health tab on real data (get_profile_health_summary).
 * Rendered instead of the demo tab only when VITE_HEALTH_REAL_DATA="true".
 *
 * Every block is conditional on the RPC having returned it: no community
 * figure below the server's cohort threshold, no categories without the
 * subject's consent, no activity for anyone but the owner, and no section
 * shown with a placeholder value.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Award, Brain, Droplet, Flame, Footprints, Moon, TrendingUp, Trophy, Users, Utensils, type LucideIcon } from "lucide-react";
import { useProfileHealthSummary, type HealthAchievement, type ProfileHealthSummary } from "@/hooks/useProfileHealthSummary";
import { pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { useProfile } from "@/context/ProfileProvider";
import type { FieldVisibility, UserProfile } from "@/types/profile";
import { fmtNumber } from "@/lib/locale-format";
import { notifyError, t } from "@/lib/i18n-toast";

const VITANA_INDEX_MAX = 999;
const PILLAR_MAX = 200;
const PILLARS: VitanaPillarKey[] = ["nutrition", "hydration", "exercise", "sleep", "mental"];
const PILLAR_ICON: Record<VitanaPillarKey, LucideIcon> = {
  nutrition: Utensils,
  hydration: Droplet,
  exercise: Activity,
  sleep: Moon,
  mental: Brain,
};

interface ProfileHealthTabRealProps {
  profile: UserProfile;
  /** Auth user id of the profile owner. */
  userId: string | undefined;
}

export function ProfileHealthTabReal({ userId }: ProfileHealthTabRealProps) {
  const { data, isLoading, isError } = useProfileHealthSummary(userId, true);

  if (isLoading) {
    return (
      <div className="w-full space-y-4 rounded-2xl p-6" data-testid="health-real-loading">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return <p className="p-6 text-sm text-muted-foreground">{t("profile.healthReal.loadError")}</p>;
  }
  if (!data || !data.hasIndex) {
    return <p className="p-6 text-sm text-muted-foreground">{t("profile.healthReal.noIndex")}</p>;
  }

  return (
    <div className="w-full space-y-6 rounded-2xl bg-gradient-to-b from-white to-emerald-50/60 p-6 dark:from-slate-900 dark:to-emerald-950" data-testid="health-real">
      {data.isOwner && <ShareControl />}
      <OverallCard summary={data} />
      <StandingCard summary={data} />
      {data.achievements.length > 0 && <AchievementsCard achievements={data.achievements} />}
      {data.pillars && <PillarsGrid summary={data} />}
      {data.isOwner && data.activity && <ActivityCard summary={data} />}
    </div>
  );
}

function OverallCard({ summary }: { summary: ProfileHealthSummary }) {
  const score = summary.score ?? 0;
  return (
    <Card className="rounded-3xl border-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
      <CardContent className="px-8 py-10 text-center">
        <div className="mb-3 inline-flex items-center gap-3">
          <Activity className="h-6 w-6 text-emerald-600" aria-hidden />
          <h3 className="text-lg font-semibold text-foreground">{t("screens.profile.overallHealthScore")}</h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-7xl font-bold tabular-nums text-transparent" data-testid="health-real-score">
          {score}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("profile.indexHero.ofMax", { max: VITANA_INDEX_MAX })}</p>
        {summary.standing?.available && summary.standing.topPercent !== null && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            {t("profile.healthReal.topPercent", { percent: summary.standing.topPercent })}
          </span>
        )}
        <div className="mx-auto mt-6 max-w-md">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted/40">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(100, (score / VITANA_INDEX_MAX) * 100)}%` }} />
          </div>
          {summary.weekDelta !== null && summary.weekDelta > 0 && (
            <p className="mt-3 text-sm text-emerald-700">{t("profile.indexHero.momentumRisingFast", { delta: summary.weekDelta })}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StandingCard({ summary }: { summary: ProfileHealthSummary }) {
  const s = summary.standing;
  if (!s) return null;
  // Below the threshold only the owner is told why nothing is compared yet.
  if (!s.available) {
    if (!summary.isOwner) return null;
    return (
      <Card className="rounded-2xl border-muted/40" data-testid="health-real-standing-pending">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <Users className="h-5 w-5 shrink-0" aria-hidden />
          {t("profile.healthReal.standingPending", { min: summary.minCohort })}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-2xl border-muted/40" data-testid="health-real-standing">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t("profile.healthReal.communityStanding")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-foreground">{t("profile.healthReal.topPercent", { percent: s.topPercent ?? 0 })}</div>
          <div className="text-xs text-muted-foreground">{t("profile.healthReal.amongMembers", { count: fmtNumber(s.cohortSize) })}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{fmtNumber(s.communityAverage ?? 0)}</div>
          <div className="text-xs text-muted-foreground">{t("profile.healthReal.communityAverage")}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsCard({ achievements }: { achievements: HealthAchievement[] }) {
  return (
    <Card className="rounded-2xl border-violet-200/40 bg-gradient-to-r from-violet-50/80 to-purple-50/80 dark:from-violet-950/40 dark:to-purple-950/40" data-testid="health-real-achievements">
      <CardContent className="space-y-2 p-5">
        <div className="text-sm font-medium text-foreground">{t("profile.healthReal.achievements")}</div>
        {achievements.map((a) => (
          <div key={a.type} className="flex items-center gap-2 text-sm text-muted-foreground">
            {a.type === "personal_best" && <><Award className="h-4 w-4 text-violet-600" aria-hidden />{t("profile.healthReal.personalBest", { score: a.score })}</>}
            {a.type === "rising_week" && <><TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />{t("profile.indexHero.momentumRisingFast", { delta: a.delta })}</>}
            {a.type === "logging_streak" && <><Flame className="h-4 w-4 text-orange-500" aria-hidden />{t("profile.indexHero.streak", { count: a.days })}</>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PillarsGrid({ summary }: { summary: ProfileHealthSummary }) {
  const pillars = summary.pillars!;
  return (
    <div data-testid="health-real-pillars">
      {summary.isBaseline && (
        <p className="mb-3 text-sm text-muted-foreground">{t("profile.healthReal.baselineNote")}</p>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((key) => {
          const p = pillars[key];
          const Icon = PILLAR_ICON[key];
          return (
            <Card key={key} className="rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 text-white shadow-md">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span className="font-semibold text-foreground">{pillarLabel(key)}</span>
                  </div>
                  {p.delta7d !== null && p.delta7d !== 0 && (
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${p.delta7d > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {t("profile.healthReal.deltaThisWeek", { delta: `${p.delta7d > 0 ? "+" : ""}${p.delta7d}` })}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {p.score}
                  <span className="text-base font-normal text-muted-foreground">/{PILLAR_MAX}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(100, (p.score / PILLAR_MAX) * 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ActivityCard({ summary }: { summary: ProfileHealthSummary }) {
  const a = summary.activity!;
  const rows: Array<{ icon: LucideIcon; text: string }> = [];
  if (a.sleepAvgMinutes7d !== null && a.sleepNights7d > 0) {
    rows.push({ icon: Moon, text: t("profile.healthReal.sleepAvg", { hours: fmtNumber(a.sleepAvgMinutes7d / 60, { maximumFractionDigits: 1 }), nights: a.sleepNights7d }) });
  }
  if (a.waterAvgMl7d !== null) {
    rows.push({ icon: Droplet, text: t("profile.healthReal.waterAvg", { liters: fmtNumber(a.waterAvgMl7d / 1000, { maximumFractionDigits: 1 }) }) });
  }
  if (a.workoutMinutes7d !== null) {
    rows.push({ icon: Activity, text: t("profile.healthReal.workoutMinutes", { minutes: fmtNumber(a.workoutMinutes7d) }) });
  }
  if (a.stepsAvg7d !== null) {
    rows.push({ icon: Footprints, text: t("profile.healthReal.stepsAvg", { steps: fmtNumber(a.stepsAvg7d) }) });
  }
  if (a.meditationMinutes7d !== null) {
    rows.push({ icon: Brain, text: t("profile.healthReal.meditationMinutes", { minutes: fmtNumber(a.meditationMinutes7d) }) });
  }
  return (
    <Card className="rounded-2xl border-muted/40" data-testid="health-real-activity">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("profile.healthReal.last7Days")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {a.daysLogged7d === 0 ? (
          <p className="text-muted-foreground">{t("profile.healthReal.noActivity")}</p>
        ) : (
          <>
            <p className="text-muted-foreground">{t("profile.healthReal.daysLogged", { days: a.daysLogged7d })}</p>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-foreground">
                <r.icon className="h-4 w-4 text-emerald-600" aria-hidden />
                {r.text}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Owner-only: who may see this tab. Existing account_visibility write path. */
function ShareControl() {
  const { profile, setFieldVisibility } = useProfile();
  const value: FieldVisibility = profile.account?.visibility?.vitanaHealth ?? "private";
  return (
    <Card className="rounded-2xl border border-dashed border-muted-foreground/20" data-testid="health-real-share">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{t("profile.healthReal.shareTitle")}</div>
          <p className="text-xs text-muted-foreground">{t("profile.healthReal.shareHint")}</p>
        </div>
        <Select
          value={value}
          onValueChange={async (next) => {
            try {
              await setFieldVisibility("vitanaHealth", next as FieldVisibility);
            } catch {
              notifyError("toasts.profile.couldNotUpdateVisibility");
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label={t("profile.healthReal.shareTitle")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">{t("profile.healthReal.shareOnlyMe")}</SelectItem>
            <SelectItem value="connections">{t("profile.healthReal.shareConnections")}</SelectItem>
            <SelectItem value="public">{t("profile.healthReal.shareEveryone")}</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
